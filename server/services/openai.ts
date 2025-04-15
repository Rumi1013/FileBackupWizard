import OpenAI from "openai";
import type { 
  MMFile, 
  InsertFileRecommendationType,
  QualityMetrics
} from '@shared/schema';

// Create an OpenAI client using the environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Define type for AI recommendation results
interface AIRecommendationResult {
  recommendations: {
    type: string;
    text: string;
    priority: string;
  }[];
}

/**
 * Analyzes file content and generates recommendations.
 */
export async function generateFileRecommendations(
  file: MMFile,
  fileContent: string,
  fileQualityMetrics?: QualityMetrics
): Promise<InsertFileRecommendationType[]> {
  try {
    // Prepare prompt with file information and content
    const prompt = prepareRecommendationPrompt(file, fileContent, fileQualityMetrics);
    
    // Call OpenAI API for recommendations
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert file management assistant specialized in analyzing files and providing actionable recommendations for organization, improvement, and optimization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Parse the AI response
    const result = JSON.parse(response.choices[0].message.content || "{}") as AIRecommendationResult;
    
    // Convert AI response to our database schema format
    return convertAIResponseToRecommendations(result, file.id);
  } catch (error) {
    console.error("Error generating file recommendations:", error);
    throw new Error(`OpenAI recommendation generation failed: ${error}`);
  }
}

/**
 * Prepares a detailed prompt for the AI based on file information and quality metrics.
 */
function prepareRecommendationPrompt(
  file: MMFile, 
  fileContent: string,
  metrics?: QualityMetrics
): string {
  // File extension to determine file type
  const ext = file.type.toLowerCase();
  
  // Create a concise representation of the file content
  let contentSummary: string;
  if (fileContent.length > 1000) {
    contentSummary = fileContent.substring(0, 1000) + "... (content truncated)";
  } else {
    contentSummary = fileContent;
  }
  
  // Base prompt structure
  let prompt = `
    Please analyze the following file and provide recommendations:
    
    FILE INFORMATION:
    - Name: ${file.name}
    - Type: ${file.type}
    - Size: ${file.size} bytes
    
    FILE CONTENT:
    ${contentSummary}
  `;
  
  // Add quality metrics if available
  if (metrics) {
    prompt += `\nQUALITY METRICS:\n`;
    
    if (metrics.codeQuality) {
      prompt += `
        Code Quality:
        - Linting Score: ${metrics.codeQuality.lintingScore}
        - Complexity: ${metrics.codeQuality.complexity}
        - Documentation: ${metrics.codeQuality.documentation}
      `;
    }
    
    if (metrics.documentQuality) {
      prompt += `
        Document Quality:
        - Readability: ${metrics.documentQuality.readability}
        - Formatting: ${metrics.documentQuality.formatting}
        - Completeness: ${metrics.documentQuality.completeness}
      `;
    }
    
    if (metrics.imageQuality) {
      prompt += `
        Image Quality:
        - Resolution: ${metrics.imageQuality.resolution}
        - Color Profile: ${metrics.imageQuality.colorProfile}
        - Compression: ${metrics.imageQuality.compression}
      `;
    }
  }
  
  // Add specific instructions based on file type
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp'].includes(ext)) {
    prompt += `
      Please focus on:
      - Code quality improvements
      - Performance optimizations
      - Best practices
      - Documentation needs
    `;
  } else if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) {
    prompt += `
      Please focus on:
      - Readability improvements
      - Structure and organization
      - Content completeness
      - Formatting suggestions
    `;
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) {
    prompt += `
      Please focus on:
      - File optimization
      - Metadata improvements
      - Format conversion suggestions
      - Organization recommendations
    `;
  }
  
  // Final instruction for output format
  prompt += `
    Please provide your recommendations in the following JSON format:
    {
      "recommendations": [
        {
          "type": "improvement|organization|optimization|security|accessibility",
          "text": "Detailed recommendation text",
          "priority": "high|medium|low"
        }
      ]
    }
    
    Provide 3-5 specific, actionable recommendations.
  `;
  
  return prompt;
}

/**
 * Converts AI response to our database schema format.
 */
function convertAIResponseToRecommendations(
  aiResponse: AIRecommendationResult, 
  fileId: string
): InsertFileRecommendationType[] {
  if (!aiResponse.recommendations || !Array.isArray(aiResponse.recommendations)) {
    return [];
  }
  
  return aiResponse.recommendations.map(rec => ({
    fileId,
    recommendationType: rec.type,
    recommendationText: rec.text,
    priority: rec.priority,
    metadata: {}
  }));
}

/**
 * Generate recommendations for multiple files in a batch.
 */
export async function batchGenerateRecommendations(
  files: Array<{file: MMFile, content: string, metrics?: QualityMetrics}>
): Promise<InsertFileRecommendationType[]> {
  const allRecommendations: InsertFileRecommendationType[] = [];
  
  // Process each file sequentially
  // In a production environment, we might want to implement parallel processing with rate limiting
  for (const { file, content, metrics } of files) {
    try {
      const recommendations = await generateFileRecommendations(file, content, metrics);
      allRecommendations.push(...recommendations);
    } catch (error) {
      console.error(`Error generating recommendations for file ${file.id}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  return allRecommendations;
}