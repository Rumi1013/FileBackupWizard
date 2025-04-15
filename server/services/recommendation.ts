import * as fs from 'fs/promises';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { 
  fileRecommendations,
  FileRecommendationType,
  InsertFileRecommendationType,
  recommendationFeedback,
  InsertRecommendationFeedbackType,
  mmFiles,
  MMFile
} from '@shared/schema';
import { generateFileRecommendations, batchGenerateRecommendations } from './openai';

/**
 * Recommendation Service
 * Handles all recommendation-related operations including creation, retrieval, and feedback.
 */
export class RecommendationService {
  /**
   * Creates recommendations for a file
   */
  async createRecommendation(fileId: string): Promise<FileRecommendationType[]> {
    try {
      // 1. Get the file from the database
      const [file] = await db.select().from(mmFiles).where(eq(mmFiles.id, fileId));
      
      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // 2. Read the file content from the filesystem
      let content = '';
      try {
        content = await fs.readFile(file.path, 'utf-8');
      } catch (error) {
        console.error(`Error reading file content: ${error.message}`);
        content = ''; // If we can't read the file, we'll generate recommendations with empty content
      }
      
      // 3. Generate recommendations using AI
      const recommendations = await generateFileRecommendations(file, content);
      
      // 4. Store the recommendations in the database
      const insertedRecommendations = await this.storeRecommendations(recommendations);
      
      return insertedRecommendations;
    } catch (error) {
      console.error(`Error creating recommendations: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Creates recommendations for multiple files in a batch
   */
  async createBatchRecommendations(fileIds: string[]): Promise<FileRecommendationType[]> {
    try {
      // 1. Get all files from the database
      const files = await db.select().from(mmFiles).where(
        fileIds.length > 0 ? 
          fileIds.map(id => eq(mmFiles.id, id)).reduce((a, b) => a || b) :
          undefined
      );
      
      // Prepare the array of files with their content
      const filesWithContent = await Promise.all(
        files.map(async (file) => {
          let content = '';
          try {
            content = await fs.readFile(file.path, 'utf-8');
          } catch (error) {
            console.error(`Error reading file ${file.id}: ${error.message}`);
          }
          return { file, content };
        })
      );
      
      // 2. Generate recommendations for all files
      const recommendations = await batchGenerateRecommendations(filesWithContent);
      
      // 3. Store the recommendations in the database
      const insertedRecommendations = await this.storeRecommendations(recommendations);
      
      return insertedRecommendations;
    } catch (error) {
      console.error(`Error creating batch recommendations: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Stores a list of recommendations in the database
   */
  private async storeRecommendations(
    recommendations: InsertFileRecommendationType[]
  ): Promise<FileRecommendationType[]> {
    if (recommendations.length === 0) {
      return [];
    }
    
    // Insert all recommendations into the database
    return await db.insert(fileRecommendations)
      .values(recommendations)
      .returning();
  }
  
  /**
   * Gets all recommendations for a specific file
   */
  async getRecommendationsForFile(fileId: string): Promise<FileRecommendationType[]> {
    return await db
      .select()
      .from(fileRecommendations)
      .where(eq(fileRecommendations.fileId, fileId));
  }
  
  /**
   * Gets all recommendations based on a specific type
   */
  async getRecommendationsByType(type: string): Promise<FileRecommendationType[]> {
    return await db
      .select()
      .from(fileRecommendations)
      .where(eq(fileRecommendations.recommendationType, type));
  }
  
  /**
   * Mark a recommendation as implemented
   */
  async markRecommendationImplemented(
    recommendationId: string, 
    implemented: boolean = true
  ): Promise<FileRecommendationType> {
    const [updated] = await db
      .update(fileRecommendations)
      .set({ implemented })
      .where(eq(fileRecommendations.id, recommendationId))
      .returning();
      
    if (!updated) {
      throw new Error(`Recommendation with ID ${recommendationId} not found`);
    }
    
    return updated;
  }
  
  /**
   * Add feedback for a recommendation
   */
  async addRecommendationFeedback(
    feedback: InsertRecommendationFeedbackType
  ): Promise<InsertRecommendationFeedbackType> {
    const [inserted] = await db
      .insert(recommendationFeedback)
      .values(feedback)
      .returning();
      
    return inserted;
  }
  
  /**
   * Get all recommendations
   */
  async getAllRecommendations(): Promise<FileRecommendationType[]> {
    return await db.select().from(fileRecommendations);
  }
}