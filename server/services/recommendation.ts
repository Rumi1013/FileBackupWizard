import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { 
  FileRecommendation, 
  InsertFileRecommendationType,
  RecommendationFeedbackType,
  InsertRecommendationFeedbackType,
  QualityMetrics,
  FileOrganizationRules,
  mapToFileRecommendation,
  FileRecommendationType
} from '@shared/schema';
import * as openaiService from './openai';

/**
 * Generate AI-powered recommendations for a file
 * 
 * @param filePath The path to the file
 * @returns Array of file recommendations
 */
export async function generateRecommendationsForFile(filePath: string): Promise<FileRecommendation[]> {
  try {
    // Check if file exists
    const fileStats = await fs.stat(filePath);
    
    if (!fileStats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    
    // Get file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Get file assessment to get metrics with fallback
    let fileMetrics = {};
    try {
      const fileAssessment = await storage.assessFile(filePath);
      fileMetrics = fileAssessment.metadata || {};
    } catch (assessmentError) {
      console.warn(`Could not get file assessment, using default metrics: ${assessmentError}`);
      
      // Provide fallback metrics based on file type
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) {
        fileMetrics = {
          documentQuality: {
            readability: 0.7,
            formatting: 0.7,
            completeness: 0.7
          }
        };
      } else if (['.js', '.ts', '.jsx', '.tsx', '.py'].includes(ext)) {
        fileMetrics = {
          codeQuality: {
            lintingScore: 0.7,
            complexity: 0.7,
            documentation: 0.7
          }
        };
      }
    }
    
    // Get file organization rules
    const organizationRules: FileOrganizationRules = {
      qualityThresholds: {
        code: 0.7,
        documents: 0.6,
        images: 0.5,
        videos: 0.6
      },
      monetizationCriteria: {
        minQualityScore: 0.8,
        requiredMetadata: ['title', 'description', 'keywords'],
        contentTypes: ['.md', '.doc', '.docx', '.pdf', '.mp4', '.mov']
      },
      deletionRules: {
        ageThreshold: 90, // days
        sizeThreshold: 100 * 1024 * 1024, // 100MB
        qualityThreshold: 0.3
      }
    };
    
    // Generate recommendations using OpenAI
    const openaiRecommendations = await openaiService.generateFileRecommendations(
      filePath,
      fileContent,
      fileMetrics as QualityMetrics,
      organizationRules
    );
    
    // Store recommendations in the database
    const storedRecommendations = await Promise.all(
      openaiRecommendations.map(async (rec) => {
        const insertRec: InsertFileRecommendationType = {
          fileId: rec.file_id || filePath,
          recommendationType: rec.recommendation_type,
          recommendationText: rec.recommendation_text,
          priority: rec.priority,
          metadata: rec.metadata || {}
        };
        
        const dbRec = await storage.createFileRecommendation(insertRec);
        return mapToFileRecommendation(dbRec);
      })
    );
    
    return storedRecommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Generate recommendations for readability improvements
 * 
 * @param filePath The path to the file
 * @returns Array of file recommendations focused on readability
 */
export async function generateReadabilityRecommendations(filePath: string): Promise<FileRecommendation[]> {
  try {
    // Check if file exists
    const fileStats = await fs.stat(filePath);
    
    if (!fileStats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    
    // Get file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Generate readability recommendations
    const readabilityRecs = await openaiService.generateReadabilityRecommendations(
      filePath,
      fileContent
    );
    
    // Store recommendations in the database
    const storedRecommendations = await Promise.all(
      readabilityRecs.map(async (rec) => {
        const insertRec: InsertFileRecommendationType = {
          fileId: rec.file_id || filePath,
          recommendationType: 'quality_improvement',
          recommendationText: rec.recommendation_text,
          priority: rec.priority,
          metadata: { ...rec.metadata, focus_area: 'readability' }
        };
        
        const dbRec = await storage.createFileRecommendation(insertRec);
        return mapToFileRecommendation(dbRec);
      })
    );
    
    return storedRecommendations;
  } catch (error) {
    console.error('Error generating readability recommendations:', error);
    throw error;
  }
}

/**
 * Generate recommendations for directory organization
 * 
 * @param dirPath The path to the directory
 * @returns Array of directory organization recommendations
 */
export async function generateDirectoryRecommendations(dirPath: string): Promise<FileRecommendation[]> {
  try {
    // Check if directory exists
    const dirStats = await fs.stat(dirPath);
    
    if (!dirStats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }
    
    // Normalize path to handle relative paths better
    const normalizedPath = path.resolve(dirPath);
    console.log(`Analyzing directory: ${normalizedPath}`);
    
    try {
      // Scan directory to get file list
      const files = await fs.readdir(normalizedPath);
      
      // Count file types
      const fileTypes: Record<string, number> = {};
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      }
      console.log(`File types in directory: ${JSON.stringify(fileTypes)}`);
      
      // Generate directory recommendations
      const dirRecommendations = await openaiService.generateDirectoryRecommendations(
        normalizedPath,
        files,
        fileTypes
      );
      
      // If no recommendations were generated, create a fallback recommendation
      if (!dirRecommendations || dirRecommendations.length === 0) {
        console.log("OpenAI didn't return any recommendations, using fallback");
        const timestamp = new Date().toISOString();
        const fallbackRecs = [{
          id: uuidv4(),
          file_id: normalizedPath,
          recommendation_type: 'organization',
          recommendation_text: "Consider organizing files by type and function to improve navigation",
          priority: 'medium',
          created_at: timestamp,
          implemented: false,
          metadata: { source: 'fallback', focus_area: 'directory_structure' }
        }];
        
        // Store fallback recommendation
        const storedFallbackRecs = await Promise.all(
          fallbackRecs.map(async (rec) => {
            const insertRec: InsertFileRecommendationType = {
              fileId: rec.file_id || normalizedPath,
              recommendationType: 'organization',
              recommendationText: rec.recommendation_text,
              priority: rec.priority,
              metadata: { ...rec.metadata, focus_area: 'directory_structure' }
            };
            
            const dbRec = await storage.createFileRecommendation(insertRec);
            return mapToFileRecommendation(dbRec);
          })
        );
        
        return storedFallbackRecs;
      }
      
      // Store recommendations in the database
      const storedRecommendations = await Promise.all(
        dirRecommendations.map(async (rec) => {
          const insertRec: InsertFileRecommendationType = {
            fileId: rec.file_id || normalizedPath,
            recommendationType: 'organization',
            recommendationText: rec.recommendation_text,
            priority: rec.priority,
            metadata: { ...rec.metadata, focus_area: 'directory_structure' }
          };
          
          const dbRec = await storage.createFileRecommendation(insertRec);
          return mapToFileRecommendation(dbRec);
        })
      );
      
      return storedRecommendations;
    } catch (fsError) {
      console.error(`Error reading directory ${normalizedPath}:`, fsError);
      throw new Error(`Failed to read directory contents: ${fsError.message}`);
    }
  } catch (error) {
    console.error('Error generating directory recommendations:', error);
    throw error;
  }
}

/**
 * Mark a recommendation as implemented
 * 
 * @param recommendationId The ID of the recommendation
 * @param implemented Whether the recommendation is implemented (default: true)
 * @returns The updated recommendation
 */
export async function markRecommendationImplemented(
  recommendationId: string, 
  implemented: boolean = true
): Promise<FileRecommendation> {
  const dbRec = await storage.markRecommendationImplemented(recommendationId, implemented);
  return mapToFileRecommendation(dbRec);
}

/**
 * Add feedback for a recommendation
 * 
 * @param feedback The feedback data
 * @returns The stored feedback
 */
export async function addRecommendationFeedback(
  feedback: InsertRecommendationFeedbackType
): Promise<RecommendationFeedbackType> {
  return await storage.addRecommendationFeedback(feedback);
}

/**
 * Get recommendations for a file
 * 
 * @param fileId The ID of the file
 * @returns Array of recommendations for the file
 */
export async function getFileRecommendations(fileId: string): Promise<FileRecommendation[]> {
  const dbRecs = await storage.getFileRecommendations(fileId);
  return dbRecs.map(rec => mapToFileRecommendation(rec));
}

/**
 * Get recommendations by type
 * 
 * @param type The recommendation type
 * @returns Array of recommendations of the specified type
 */
export async function getRecommendationsByType(type: string): Promise<FileRecommendation[]> {
  const dbRecs = await storage.getRecommendationsByType(type);
  return dbRecs.map(rec => mapToFileRecommendation(rec));
}