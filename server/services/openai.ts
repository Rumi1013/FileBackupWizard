import OpenAI from "openai";
import { 
  FileRecommendationType, 
  InsertFileRecommendationType, 
  MMFile,
  AIRecommendationResult,
  QualityMetrics
} from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes file content and generates recommendations.
 */
export async function generateFileRecommendations(
  file: MMFile,
  content: string,
  fileQualityMetrics?: QualityMetrics
): Promise<InsertFileRecommendationType[]> {
  try {
    // Prepare prompt with file information and metrics
    const prompt = prepareRecommendationPrompt(file, content, fileQualityMetrics);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system", 
          content: "You are an expert file organizer and content analyst specializing in helping neurodivergent users organize their files efficiently."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    // Convert AI response to our schema format
    return convertAIResponseToRecommendations(aiResponse, file.id);
  } catch (error) {
    console.error("Error generating file recommendations:", error);
    throw new Error(`Failed to generate file recommendations: ${error.message}`);
  }
}

/**
 * Prepares a detailed prompt for the AI based on file information and quality metrics.
 */
function prepareRecommendationPrompt(
  file: MMFile, 
  content: string, 
  metrics?: QualityMetrics
): string {
  const contentPreview = content.substring(0, 2000) + (content.length > 2000 ? '...' : '');
  
  return `I need recommendations for organizing and improving the following file:
  
File Information:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Created: ${file.createdAt}
- Last Modified: ${file.updatedAt}

${metrics ? `Quality Metrics:\n${JSON.stringify(metrics, null, 2)}\n` : ''}

Content Preview:
${contentPreview}

Please analyze this file and provide the following in JSON format:
1. A list of recommendations with the following properties for each:
   - recommendation_type: One of "quality_improvement", "monetization", "organization", or "deletion"
   - recommendation_text: A specific, actionable recommendation
   - priority: "high", "medium", or "low"
   - metadata: Any additional information that might be helpful

2. Insights about the file including:
   - improvement_opportunities: Number of possible improvements
   - monetization_potential: "high", "medium", or "low"
   - organization_score: A number between 0-100 indicating how well organized the file is

3. A brief summary of your analysis

Please return your response in the following JSON format:
{
  "recommendations": [
    {
      "recommendation_type": string,
      "recommendation_text": string,
      "priority": string,
      "metadata": object
    }
  ],
  "insights": {
    "improvement_opportunities": number,
    "monetization_potential": string,
    "organization_score": number
  },
  "summary": string
}`;
}

/**
 * Converts AI response to our database schema format.
 */
function convertAIResponseToRecommendations(
  aiResponse: AIRecommendationResult, 
  fileId: string
): InsertFileRecommendationType[] {
  return aiResponse.recommendations.map(rec => ({
    fileId,
    recommendationType: rec.recommendation_type,
    recommendationText: rec.recommendation_text,
    priority: rec.priority,
    metadata: rec.metadata
  }));
}

/**
 * Generate recommendations for multiple files in a batch.
 */
export async function batchGenerateRecommendations(
  files: Array<{file: MMFile, content: string, metrics?: QualityMetrics}>
): Promise<InsertFileRecommendationType[]> {
  const allRecommendations: InsertFileRecommendationType[] = [];
  
  // Process files in batches to prevent rate limiting
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    // Generate recommendations for each file in the batch
    const batchPromises = batch.map(({file, content, metrics}) => 
      generateFileRecommendations(file, content, metrics)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten the results and add to all recommendations
    allRecommendations.push(...batchResults.flat());
  }
  
  return allRecommendations;
}