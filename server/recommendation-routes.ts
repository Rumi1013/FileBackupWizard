import { Router, Request, Response, NextFunction } from 'express';
import * as recommendationService from './services/recommendation';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InsertRecommendationFeedbackType } from '@shared/schema';

const router = Router();

/**
 * Generate recommendations for a file
 * POST /api/recommendations/generate
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const recommendations = await recommendationService.generateRecommendationsForFile(filePath);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    next(error);
  }
});

/**
 * Generate recommendations for multiple files
 * POST /api/recommendations/generate-batch
 */
router.post('/generate-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePaths } = req.body;
    
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'File paths array is required' });
    }
    
    const recommendationsByFile: Record<string, any> = {};
    
    for (const filePath of filePaths) {
      try {
        const recommendations = await recommendationService.generateRecommendationsForFile(filePath);
        recommendationsByFile[filePath] = recommendations;
      } catch (fileError) {
        console.error(`Error generating recommendations for ${filePath}:`, fileError);
        recommendationsByFile[filePath] = { error: fileError.message };
      }
    }
    
    res.json(recommendationsByFile);
  } catch (error) {
    console.error('Error in batch recommendation generation:', error);
    next(error);
  }
});

/**
 * Get recommendations for a file
 * GET /api/recommendations/file/:fileId
 */
router.get('/file/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = req.params.fileId;
    
    // Handle both file paths and UUIDs
    const decodedFileId = decodeURIComponent(fileId);
    
    const recommendations = await recommendationService.getFileRecommendations(decodedFileId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error retrieving file recommendations:', error);
    next(error);
  }
});

/**
 * Get recommendations by type
 * GET /api/recommendations/type/:type
 */
router.get('/type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.params.type;
    
    if (!['quality_improvement', 'organization', 'monetization', 'deletion'].includes(type)) {
      return res.status(400).json({ error: 'Invalid recommendation type' });
    }
    
    const recommendations = await recommendationService.getRecommendationsByType(type);
    res.json(recommendations);
  } catch (error) {
    console.error('Error retrieving recommendations by type:', error);
    next(error);
  }
});

/**
 * Mark a recommendation as implemented
 * PATCH /api/recommendations/:id/implement
 */
router.patch('/:id/implement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const { implemented = true } = req.body;
    
    const updatedRecommendation = await recommendationService.markRecommendationImplemented(
      id,
      implemented
    );
    
    res.json(updatedRecommendation);
  } catch (error) {
    console.error('Error marking recommendation as implemented:', error);
    next(error);
  }
});

/**
 * Add feedback for a recommendation
 * POST /api/recommendations/:id/feedback
 */
router.post('/:id/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendationId = req.params.id;
    const { helpful, feedbackText } = req.body;
    
    if (helpful === undefined) {
      return res.status(400).json({ error: 'Helpful status is required' });
    }
    
    const feedback: InsertRecommendationFeedbackType = {
      id: uuidv4(),
      recommendationId,
      helpful,
      feedbackText: feedbackText || null,
      createdAt: new Date()
    };
    
    const savedFeedback = await recommendationService.addRecommendationFeedback(feedback);
    res.json(savedFeedback);
  } catch (error) {
    console.error('Error adding recommendation feedback:', error);
    next(error);
  }
});

/**
 * Generate readability recommendations for a text file
 * POST /api/recommendations/readability
 */
router.post('/readability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Check file extension to ensure it's a text file
    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.js', '.ts', '.py', '.rb', '.java'];
    
    if (!textExtensions.includes(ext)) {
      return res.status(400).json({ 
        error: 'File must be a text file with a supported extension' 
      });
    }
    
    const recommendations = await recommendationService.generateReadabilityRecommendations(filePath);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating readability recommendations:', error);
    next(error);
  }
});

/**
 * Generate directory organization recommendations
 * POST /api/recommendations/directory
 */
router.post('/directory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }
    
    // Ensure the path exists and is a directory
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' });
      }
    } catch (statError) {
      return res.status(400).json({ error: `Directory does not exist: ${statError.message}` });
    }
    
    const recommendations = await recommendationService.generateDirectoryRecommendations(dirPath);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating directory recommendations:', error);
    next(error);
  }
});

export default router;