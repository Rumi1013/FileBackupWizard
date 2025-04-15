import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { QualityMetrics, FileOrganizationRules, FileRecommendation } from "@shared/schema";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Default model to use
const DEFAULT_MODEL = "gpt-4o";

/**
 * Generate AI-powered file recommendations based on file content and metadata
 */
export async function generateFileRecommendations(
  filePath: string, 
  fileContent: string, 
  metrics: QualityMetrics, 
  rules: FileOrganizationRules
): Promise<FileRecommendation[]> {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // Check if the API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return generateFallbackRecommendations(filePath, metrics);
    }

    // Prepare the content for AI analysis (truncate if too large)
    const MAX_CONTENT_SIZE = 5000; // characters
    const truncatedContent = fileContent.length > MAX_CONTENT_SIZE 
      ? fileContent.substring(0, MAX_CONTENT_SIZE) + "... (content truncated for analysis)"
      : fileContent;

    // Format quality metrics into a string for the prompt
    const metricsStr = formatMetricsForPrompt(metrics);
    
    // Format organization rules into a string for the prompt
    const rulesStr = JSON.stringify(rules, null, 2);

    // Build the prompt for OpenAI
    const prompt = `
You are an AI assistant for a file management system designed for users with ADHD or neurodivergent needs. 
Please analyze the following file and provide recommendations to improve its quality, organization, and potential monetization.

File Information:
- Filename: ${fileName}
- File type: ${fileExt}
- File path: ${filePath}

File Content Sample:
\`\`\`
${truncatedContent}
\`\`\`

Quality Metrics Analysis:
${metricsStr}

Organization Rules:
\`\`\`
${rulesStr}
\`\`\`

Based on the above, please provide recommendations in the following categories:
1. Quality Improvement
2. Organization
3. Monetization (if applicable)
4. Deletion (if recommended)

For each recommendation, provide:
- A clear, concise recommendation text
- The recommendation type (quality_improvement, organization, monetization, deletion)
- A priority level (high, medium, low)
- If deletion is recommended, provide a clear reason why

Format your response as a JSON array of recommendation objects with these fields:
- id: a unique string for each recommendation
- file_id: "${filePath}" (use the file path as ID for now)
- recommendation_type: one of "quality_improvement", "organization", "monetization", or "deletion"
- recommendation_text: the actual recommendation text
- priority: "high", "medium", or "low"
- metadata: any additional information that might be helpful
- created_at: current timestamp
- implemented: false (default value)

Make sure your recommendations are specific, actionable, and helpful for neurodivergent users.
`;

    // Call OpenAI API for recommendations
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are a specialized file management assistant that provides recommendations to improve file quality, organization, and potential monetization. You provide JSON responses only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and validate the response
    const recommendations = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!Array.isArray(recommendations)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    return generateFallbackRecommendations(filePath, metrics);
  }
}

/**
 * Generate recommendations for text files focused on readability
 */
export async function generateReadabilityRecommendations(
  filePath: string,
  fileContent: string
): Promise<FileRecommendation[]> {
  try {
    // Check if the API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return [];
    }

    // Prepare the content for AI analysis (truncate if too large)
    const MAX_CONTENT_SIZE = 5000; // characters
    const truncatedContent = fileContent.length > MAX_CONTENT_SIZE 
      ? fileContent.substring(0, MAX_CONTENT_SIZE) + "... (content truncated for analysis)"
      : fileContent;

    // Build the prompt for OpenAI
    const prompt = `
You are an AI assistant specializing in making content more readable for users with ADHD or neurodivergent needs.
Please analyze the following text content and provide specific recommendations to improve its readability.

Content:
\`\`\`
${truncatedContent}
\`\`\`

Please provide 3-5 specific recommendations to make this content more readable for neurodivergent users, focusing on:
1. Text structure (paragraphs, headers, bullet points)
2. Sentence complexity and length
3. Use of visuals or formatting to aid understanding
4. Information density and cognitive load

Format your response as a JSON array of recommendation objects with these fields:
- id: a unique string for each recommendation
- file_id: "${filePath}" (use the file path as ID)
- recommendation_type: "quality_improvement"
- recommendation_text: the specific recommendation text
- priority: "high", "medium", or "low" based on impact
- metadata: { "focus_area": "readability" }
- created_at: current timestamp
- implemented: false
`;

    // Call OpenAI API for readability recommendations
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are a specialized content readability assistant for neurodivergent users. You provide JSON responses only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and validate the response
    const recommendations = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!Array.isArray(recommendations)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating readability recommendations:", error);
    return [];
  }
}

/**
 * Generate recommendations for an entire directory based on file structure and content
 */
export async function generateDirectoryRecommendations(
  dirPath: string,
  fileList: string[],
  fileTypes: Record<string, number>
): Promise<FileRecommendation[]> {
  try {
    // Check if the API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return [];
    }

    // Format file list for the prompt (limit to 50 files max)
    const fileListStr = fileList.slice(0, 50).join('\n');
    
    // Format file type statistics
    const fileTypesStr = Object.entries(fileTypes)
      .map(([type, count]) => `${type}: ${count} files`)
      .join('\n');

    // Build the prompt for OpenAI
    const prompt = `
You are an AI assistant specializing in file organization for users with ADHD or neurodivergent needs.
Please analyze the following directory structure and provide recommendations for better organization.

Directory: ${dirPath}

File Types Summary:
${fileTypesStr}

Sample Files (limited to 50):
${fileListStr}

Please provide 3-5 specific recommendations to better organize this directory for neurodivergent users, focusing on:
1. Logical grouping and folder structure
2. Naming conventions for better clarity
3. Potential file consolidation or separation
4. Overall structure to reduce cognitive load

Format your response as a JSON array of recommendation objects with these fields:
- id: a unique string for each recommendation
- file_id: "${dirPath}" (use the directory path as ID)
- recommendation_type: "organization"
- recommendation_text: the specific recommendation text
- priority: "high", "medium", or "low" based on impact
- metadata: { "focus_area": "directory_structure" }
- created_at: current timestamp
- implemented: false
`;

    // Call OpenAI API for directory recommendations
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are a specialized file organization assistant for neurodivergent users. You provide JSON responses only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and validate the response
    const recommendations = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!Array.isArray(recommendations)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating directory recommendations:", error);
    return [];
  }
}

/**
 * Generate fallback recommendations if the AI service fails
 */
function generateFallbackRecommendations(
  filePath: string, 
  metrics: QualityMetrics
): FileRecommendation[] {
  const timestamp = new Date().toISOString();
  const fileExt = path.extname(filePath).toLowerCase();
  
  const recommendations: FileRecommendation[] = [
    {
      id: "fallback-1",
      file_id: filePath,
      recommendation_type: "organization",
      recommendation_text: "Consider organizing files of similar types in dedicated folders",
      priority: "medium",
      created_at: timestamp,
      implemented: false,
      metadata: { source: "fallback" }
    }
  ];
  
  // Add file type specific recommendations
  if (['.md', '.txt', '.doc', '.docx'].includes(fileExt)) {
    recommendations.push({
      id: "fallback-2",
      file_id: filePath,
      recommendation_type: "quality_improvement",
      recommendation_text: "Add clear section headers to improve document navigation",
      priority: "high",
      created_at: timestamp,
      implemented: false,
      metadata: { source: "fallback", focus: "readability" }
    });
  } else if (['.jpg', '.png', '.gif'].includes(fileExt)) {
    recommendations.push({
      id: "fallback-3",
      file_id: filePath,
      recommendation_type: "quality_improvement",
      recommendation_text: "Add descriptive file names to improve searchability",
      priority: "medium",
      created_at: timestamp,
      implemented: false,
      metadata: { source: "fallback", focus: "metadata" }
    });
  } else if (['.js', '.ts', '.py'].includes(fileExt)) {
    recommendations.push({
      id: "fallback-4",
      file_id: filePath,
      recommendation_type: "quality_improvement",
      recommendation_text: "Add comments to explain complex code sections",
      priority: "high",
      created_at: timestamp,
      implemented: false,
      metadata: { source: "fallback", focus: "documentation" }
    });
  }
  
  return recommendations;
}

/**
 * Format metrics object into a string for the OpenAI prompt
 */
function formatMetricsForPrompt(metrics: QualityMetrics): string {
  let result = [];
  
  if (metrics.codeQuality) {
    result.push(
      "Code Quality Metrics:",
      `- Linting Score: ${metrics.codeQuality.lintingScore}`,
      `- Complexity: ${metrics.codeQuality.complexity}`,
      `- Documentation: ${metrics.codeQuality.documentation}`
    );
  }
  
  if (metrics.documentQuality) {
    result.push(
      "Document Quality Metrics:",
      `- Readability: ${metrics.documentQuality.readability}`,
      `- Formatting: ${metrics.documentQuality.formatting}`,
      `- Completeness: ${metrics.documentQuality.completeness}`
    );
  }
  
  if (metrics.imageQuality) {
    result.push(
      "Image Quality Metrics:",
      `- Resolution: ${metrics.imageQuality.resolution}`,
      `- Color Profile: ${metrics.imageQuality.colorProfile}`,
      `- Compression: ${metrics.imageQuality.compression}`
    );
  }
  
  if (metrics.videoQuality) {
    result.push(
      "Video Quality Metrics:",
      `- Resolution: ${metrics.videoQuality.resolution}`,
      `- Bitrate: ${metrics.videoQuality.bitrate}`,
      `- Duration: ${metrics.videoQuality.duration}`
    );
  }
  
  return result.join('\n');
}