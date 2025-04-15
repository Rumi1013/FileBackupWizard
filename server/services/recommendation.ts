import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { 
  FileRecommendation, 
  InsertFileRecommendationType,
  RecommendationFeedbackType,
  InsertRecommendationFeedbackType
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
    
    // Get file assessment to get metrics
    const fileAssessment = await storage.assessFile(filePath);
    
    // Get file organization rules
    const organizationRules = {
      preferredLocations: {
        images: './images',
        documents: './docs',
        code: './src',
        media: './media'
      },
      namingConventions: {
        useHyphens: true,
        useCamelCase: false,
        includeDate: true,
        dateFormat: 'YYYY-MM-DD'
      },
      categorization: {
        byType: true,
        byProject: true,
        byDate: false
      }
    };
    
    // Generate recommendations using OpenAI
    const openaiRecommendations = await openaiService.generateFileRecommendations(
      filePath,
      fileContent,
      fileAssessment.metrics || {},
      organizationRules
    );
    
    // Store recommendations in the database
    const storedRecommendations = await Promise.all(
      openaiRecommendations.map(async (rec) => {
        const insertRec: InsertFileRecommendationType = {
          id: rec.id || uuidv4(),
          fileId: rec.file_id || filePath,
          recommendationType: rec.recommendation_type,
          recommendationText: rec.recommendation_text,
          priority: rec.priority,
          implemented: rec.implemented || false,
          createdAt: new Date(rec.created_at || new Date()),
          metadata: rec.metadata || {}
        };
        
        return await storage.createFileRecommendation(insertRec);
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
          id: rec.id || uuidv4(),
          fileId: rec.file_id || filePath,
          recommendationType: 'quality_improvement',
          recommendationText: rec.recommendation_text,
          priority: rec.priority,
          implemented: rec.implemented || false,
          createdAt: new Date(rec.created_at || new Date()),
          metadata: { ...rec.metadata, focus_area: 'readability' }
        };
        
        return await storage.createFileRecommendation(insertRec);
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
    
    // Scan directory to get file list
    const files = await fs.readdir(dirPath);
    
    // Count file types
    const fileTypes: Record<string, number> = {};
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    }
    
    // Generate directory recommendations
    const dirRecommendations = await openaiService.generateDirectoryRecommendations(
      dirPath,
      files,
      fileTypes
    );
    
    // Store recommendations in the database
    const storedRecommendations = await Promise.all(
      dirRecommendations.map(async (rec) => {
        const insertRec: InsertFileRecommendationType = {
          id: rec.id || uuidv4(),
          fileId: rec.file_id || dirPath,
          recommendationType: 'organization',
          recommendationText: rec.recommendation_text,
          priority: rec.priority,
          implemented: rec.implemented || false,
          createdAt: new Date(rec.created_at || new Date()),
          metadata: { ...rec.metadata, focus_area: 'directory_structure' }
        };
        
        return await storage.createFileRecommendation(insertRec);
      })
    );
    
    return storedRecommendations;
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
  return await storage.markRecommendationImplemented(recommendationId, implemented);
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
  return await storage.getFileRecommendations(fileId);
}

/**
 * Get recommendations by type
 * 
 * @param type The recommendation type
 * @returns Array of recommendations of the specified type
 */
export async function getRecommendationsByType(type: string): Promise<FileRecommendation[]> {
  return await storage.getRecommendationsByType(type);
}