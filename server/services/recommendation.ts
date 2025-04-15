import { storage } from '../storage';
import { generateFileRecommendations, batchGenerateRecommendations } from './openai';
import type { 
  FileRecommendationType, 
  InsertFileRecommendationType,
  FileOperation,
  QualityMetrics
} from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

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
      // Get file information from storage
      const file = await storage.getMMFileById(fileId);
      
      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // For text-based files, we need to read the content
      let content = '';
      if (['.txt', '.md', '.js', '.ts', '.py', '.html', '.css', '.json'].includes(
        path.extname(file.path).toLowerCase())
      ) {
        try {
          content = await fs.readFile(file.path, 'utf-8');
        } catch (error) {
          console.error(`Error reading file content: ${error}`);
          throw new Error(`Failed to read file content: ${error}`);
        }
      }
      
      // Get file quality metrics if available
      let metrics: QualityMetrics | undefined;
      try {
        // This is an approximation - in a real system, we'd retrieve stored metrics
        const assessment = await storage.assessFile(file.path);
        metrics = assessment.metadata as QualityMetrics;
      } catch (error) {
        console.warn(`Could not get quality metrics for file: ${error}`);
        // Continue without metrics if they're not available
      }
      
      // Generate recommendations using OpenAI
      const recommendations = await generateFileRecommendations(file, content, metrics);
      
      // Store recommendations in storage
      return this.storeRecommendations(recommendations);
    } catch (error) {
      console.error(`Error creating recommendation: ${error}`);
      throw new Error(`Failed to create recommendation: ${error}`);
    }
  }
  
  /**
   * Creates recommendations for multiple files in a batch
   */
  async createBatchRecommendations(fileIds: string[]): Promise<FileRecommendationType[]> {
    try {
      const fileData = [];
      
      // Collect all file data
      for (const fileId of fileIds) {
        const file = await storage.getMMFileById(fileId);
        
        if (!file) {
          console.warn(`File with ID ${fileId} not found, skipping`);
          continue;
        }
        
        // For text-based files, read the content
        let content = '';
        if (['.txt', '.md', '.js', '.ts', '.py', '.html', '.css', '.json'].includes(
          path.extname(file.path).toLowerCase())
        ) {
          try {
            content = await fs.readFile(file.path, 'utf-8');
          } catch (error) {
            console.warn(`Could not read content for file ${fileId}, using empty content`);
          }
        }
        
        // Get file quality metrics if available
        let metrics: QualityMetrics | undefined;
        try {
          const assessment = await storage.assessFile(file.path);
          metrics = assessment.metadata as QualityMetrics;
        } catch (error) {
          console.warn(`Could not get quality metrics for file ${fileId}`);
        }
        
        fileData.push({ file, content, metrics });
      }
      
      // Generate batch recommendations
      const batchRecommendations = await batchGenerateRecommendations(fileData);
      
      // Store all recommendations
      return this.storeRecommendations(batchRecommendations);
    } catch (error) {
      console.error(`Error creating batch recommendations: ${error}`);
      throw new Error(`Failed to create batch recommendations: ${error}`);
    }
  }
  
  /**
   * Stores a list of recommendations in the database
   */
  private async storeRecommendations(
    recommendations: InsertFileRecommendationType[]
  ): Promise<FileRecommendationType[]> {
    const storedRecommendations: FileRecommendationType[] = [];
    
    for (const recommendation of recommendations) {
      try {
        const stored = await storage.createFileRecommendation(recommendation);
        storedRecommendations.push(stored);
      } catch (error) {
        console.error(`Error storing recommendation: ${error}`);
      }
    }
    
    return storedRecommendations;
  }
  
  /**
   * Gets all recommendations for a specific file
   */
  async getRecommendationsForFile(fileId: string): Promise<FileRecommendationType[]> {
    try {
      return await storage.getFileRecommendations(fileId);
    } catch (error) {
      console.error(`Error getting recommendations for file: ${error}`);
      throw new Error(`Failed to get recommendations for file: ${error}`);
    }
  }
  
  /**
   * Gets all recommendations based on a specific type
   */
  async getRecommendationsByType(type: string): Promise<FileRecommendationType[]> {
    try {
      return await storage.getRecommendationsByType(type);
    } catch (error) {
      console.error(`Error getting recommendations by type: ${error}`);
      throw new Error(`Failed to get recommendations by type: ${error}`);
    }
  }
  
  /**
   * Mark a recommendation as implemented
   */
  async markRecommendationImplemented(
    id: string, 
    implemented: boolean = true
  ): Promise<FileRecommendationType> {
    try {
      return await storage.markRecommendationImplemented(id, implemented);
    } catch (error) {
      console.error(`Error marking recommendation as implemented: ${error}`);
      throw new Error(`Failed to mark recommendation as implemented: ${error}`);
    }
  }
  
  /**
   * Add feedback for a recommendation
   */
  async addRecommendationFeedback(
    feedback: { recommendationId: string; helpful: boolean; feedbackText?: string | null }
  ) {
    try {
      return await storage.addRecommendationFeedback(feedback);
    } catch (error) {
      console.error(`Error adding recommendation feedback: ${error}`);
      throw new Error(`Failed to add recommendation feedback: ${error}`);
    }
  }
  
  /**
   * Get all recommendations
   */
  async getAllRecommendations(): Promise<FileRecommendationType[]> {
    // This is a placeholder for future implementation
    // We would need to add a method to the storage interface
    throw new Error('Method not implemented');
  }
}