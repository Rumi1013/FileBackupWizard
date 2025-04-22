import express, { Request, Response, NextFunction, Router } from 'express';
import { generateTagRecommendations, generateBatchTagRecommendations, TagRecommendation } from './services/ai-tag-recommender';
import { storage, InsertFileTag, InsertFileTagMapping } from './storage';
import * as fs from 'fs';
import * as path from 'path';

const router: Router = express.Router();

/**
 * Get AI-recommended tags for a file
 * GET /api/ai-tags/recommend?filePath=path/to/file
 */
router.get('/recommend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = req.query.filePath as string;
    
    if (!filePath) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required parameter: filePath'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 404,
        message: `File not found: ${filePath}`
      });
    }

    // Get existing tags for the file if any
    const fileId = path.normalize(filePath);
    const existingTags = await storage.getTagsForFile(fileId);
    
    // Generate tag recommendations
    const recommendations = await generateTagRecommendations(filePath, existingTags);
    
    return res.status(200).json({
      status: 200,
      data: recommendations
    });
  } catch (error: any) {
    console.error('Error generating tag recommendations:', error);
    
    // Special handling for OpenAI key errors
    if (error?.message && error.message.includes('OPENAI_API_KEY')) {
      return res.status(401).json({
        status: 401,
        message: 'OpenAI API key is missing or invalid. Please check your environment variables.'
      });
    }
    
    next(error);
  }
});

/**
 * Get batch tag recommendations for multiple files
 * POST /api/ai-tags/recommend-batch
 * Body: { filePaths: string[] }
 */
router.post('/recommend-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePaths } = req.body;
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Please provide an array of file paths'
      });
    }

    // Generate batch recommendations
    const recommendations = await generateBatchTagRecommendations(filePaths);
    
    return res.status(200).json({
      status: 200,
      data: recommendations
    });
  } catch (error: any) {
    console.error('Error generating batch tag recommendations:', error);
    
    // Special handling for OpenAI key errors
    if (error?.message && error.message.includes('OPENAI_API_KEY')) {
      return res.status(401).json({
        status: 401,
        message: 'OpenAI API key is missing or invalid. Please check your environment variables.'
      });
    }
    
    next(error);
  }
});

/**
 * Apply a recommended tag to a file
 * POST /api/ai-tags/apply
 * Body: { filePath: string, recommendation: TagRecommendation }
 */
router.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, recommendation } = req.body;
    
    if (!filePath || !recommendation) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required parameters: filePath or recommendation'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 404,
        message: `File not found: ${filePath}`
      });
    }

    // Create a new tag from the recommendation
    const fileId = path.normalize(filePath);
    const tag = await storage.createFileTag({
      name: recommendation.name,
      emoji: recommendation.emoji,
      color: recommendation.color,
      description: recommendation.description
    });

    // Apply the tag to the file
    const mapping = await storage.addTagToFile({
      fileId: fileId,
      tagId: tag.id
    });
    
    return res.status(200).json({
      status: 200,
      data: { tag, mapping }
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Apply multiple recommended tags to files in batch
 * POST /api/ai-tags/apply-batch
 * Body: { items: Array<{ filePath: string, recommendations: TagRecommendation[] }> }
 */
router.post('/apply-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Please provide an array of items with filePaths and recommendations'
      });
    }

    const results = [];
    
    for (const item of items) {
      const { filePath, recommendations } = item;
      
      if (!filePath || !recommendations || !Array.isArray(recommendations)) {
        continue;
      }
      
      const fileId = path.normalize(filePath);
      const fileResults = [];
      
      for (const recommendation of recommendations) {
        try {
          // Create a new tag from the recommendation
          const tag = await storage.createFileTag({
            name: recommendation.name,
            emoji: recommendation.emoji,
            color: recommendation.color,
            description: recommendation.description
          });
      
          // Apply the tag to the file
          const mapping = await storage.addTagToFile({
            fileId: fileId,
            tagId: tag.id
          });
          fileResults.push({ tag, mapping });
        } catch (error: any) {
          console.error(`Error applying tag to ${filePath}:`, error);
        }
      }
      
      results.push({
        filePath,
        tags: fileResults
      });
    }
    
    return res.status(200).json({
      status: 200,
      data: results
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;