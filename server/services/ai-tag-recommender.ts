import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileTypeFromFile } from "file-type";
import { FileTag } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Interface for tag recommendations
 */
export interface TagRecommendation {
  emoji: string;
  name: string;
  color: string;
  description: string;
  confidence: number; // 0-1 score indicating how confident the AI is about this tag
}

/**
 * Get the text content from a file based on its type
 */
async function getFileContent(filePath: string, maxLength: number = 20000): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file type
    const fileType = await fileTypeFromFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // For text-based files
    if (!fileType || 
        ext === '.txt' || ext === '.md' || ext === '.js' || ext === '.ts' || 
        ext === '.jsx' || ext === '.tsx' || ext === '.html' || ext === '.css' || 
        ext === '.json' || ext === '.csv' || ext === '.xml' || ext === '.yml' || 
        ext === '.yaml' || ext === '.py' || ext === '.java' || ext === '.c' || 
        ext === '.cpp' || ext === '.h' || ext === '.rb' || ext === '.php') {
      
      const content = fs.readFileSync(filePath, 'utf8');
      // Truncate if too long
      return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
    }
    
    // For binary files, just return metadata
    const stats = fs.statSync(filePath);
    return `Binary file: ${path.basename(filePath)}
Type: ${fileType?.mime || 'Unknown'}
Size: ${Math.round(stats.size / 1024)} KB
Created: ${stats.birthtime}
Modified: ${stats.mtime}`;
  } catch (error: any) {
    console.error('Error reading file:', error);
    return `Error reading file: ${error?.message || 'Unknown error'}`;
  }
}

/**
 * Generate tag recommendations for a file based on its content and existing tags
 */
export async function generateTagRecommendations(
  filePath: string, 
  existingTags: FileTag[] = []
): Promise<TagRecommendation[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Get file content
    const fileContent = await getFileContent(filePath);
    const fileName = path.basename(filePath);
    
    // Prepare existing tags for context
    const existingTagsInfo = existingTags.length > 0 
      ? `Existing tags for this file: ${existingTags.map(t => `${t.emoji} ${t.name}`).join(', ')}` 
      : 'No existing tags for this file.';

    // Midnight Magnolia brand colors for tag generation
    const brandColors = [
      '#0A192F', // Midnight Blue
      '#0A3B4D', // Midnight Teal
      '#FAF3E0', // Magnolia White
      '#D4AF37', // Rich Gold
      '#A3B18A', // Sage Green
    ];

    // Request tag recommendations from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert file organization assistant for the Midnight Magnolia brand, which specializes in helping neurodivergent users organize their files. 
          
The Midnight Magnolia brand uses these colors: Midnight Blue (#0A192F), Midnight Teal (#0A3B4D), Magnolia White (#FAF3E0), Rich Gold (#D4AF37), and Sage Green (#A3B18A).

Your task is to suggest 3-5 emoji tags for a file that help categorize it effectively. The tags should be useful for someone with ADHD who needs clear, intuitive organization.

For each tag suggestion, provide:
1. An emoji that visually represents the concept
2. A short name (1-3 words)
3. A color from the Midnight Magnolia brand palette
4. A brief description of why this tag is relevant
5. A confidence score (0.0-1.0) indicating how confident you are about this tag's relevance

Focus on these categories for tagging:
- File priority (⭐ high, 📌 medium, etc.)
- File status (✅ complete, ⏳ in progress, etc.)
- Content type (📊 data, 📄 document, 🎥 video, etc.)
- Project relevance (🏢 business, 🏠 personal, etc.)
- Monetization potential (💰 high value, 📈 growth potential, etc.)
- Action needed (🔍 review, 📝 edit, etc.)

ORGANIZATION CATEGORIES:
When tagging content, also consider these specialized organizational categories from Midnight Magnolia's content management system:

CONTENT STATUS:
- 📝 Draft - Content in draft form needing refinement
- 🔍 In Review - Content being reviewed by team members
- ✅ Approved - Content approved and ready for use
- 🌟 Published - Content that has been published and is live
- 🔄 Needs Update - Content that needs to be updated or refreshed

MONETIZATION POTENTIAL:
- 💰 High Value - Content with direct high revenue potential
- 📈 Growth Asset - Content that drives growth or audience building
- 🧲 Lead Magnet - Content designed to attract new audience members
- 🏛️ Brand Building - Content that strengthens brand identity
- 🎁 Freemium - Free content that supports premium offerings

ADHD-FRIENDLY ORGANIZATION:
- ⚡ Need Today - Files that need immediate attention today
- 🏆 Quick Win - Tasks that can be completed quickly for momentum
- 🧠 Focus Time - Requires dedicated focus time to work on
- ⏰ Revisit Later - Set aside to revisit at a specified later time
- 🌊 Overwhelm Risk - Content that may cause overwhelm - approach with care

EVENT PLANNING:
- 🗓️ Schedule - Event schedules and timelines
- 🤝 Vendor - Vendor contracts and information
- 🏢 Venue - Venue details and floor plans
- 📣 Marketing - Event marketing and promotion materials
- 💵 Budget - Event budget and financial tracking

BRAND ASSET MANAGEMENT:
- 🎨 Logo - Logo files in various formats
- 🔤 Typography - Typography assets and font files
- 🎭 Color Palette - Brand color palette specifications
- 📋 Template - Brand templates for various uses
- 📘 Brand Guide - Official brand guidelines and manuals

${existingTagsInfo}`
        },
        {
          role: "user",
          content: `Please suggest tags for this file: ${fileName}\n\nFile content or metadata:\n${fileContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse and return the recommendations
    const content = response.choices[0].message.content || '{"recommendations": []}';
    const tagSuggestions = JSON.parse(content);
    
    if (!tagSuggestions.recommendations || !Array.isArray(tagSuggestions.recommendations)) {
      throw new Error('Invalid response format from OpenAI');
    }
    
    return tagSuggestions.recommendations;
  } catch (error: any) {
    console.error('Error generating tag recommendations:', error);
    throw new Error(error?.message || 'Unknown error generating tag recommendations');
  }
}

/**
 * Generate batch tag recommendations for multiple files
 */
export async function generateBatchTagRecommendations(
  filePaths: string[]
): Promise<Record<string, TagRecommendation[]>> {
  const results: Record<string, TagRecommendation[]> = {};
  
  // Process files sequentially to avoid rate limiting
  for (const filePath of filePaths) {
    try {
      results[filePath] = await generateTagRecommendations(filePath);
    } catch (error: any) {
      console.error(`Error generating tags for ${filePath}:`, error);
      results[filePath] = [];
    }
  }
  
  return results;
}