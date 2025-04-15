import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { RecommendationService } from './services/recommendation';
import { insertFileRecommendationSchema, insertRecommendationFeedbackSchema } from '@shared/schema';

// Create an instance of the recommendation service
const recommendationService = new RecommendationService();

// Create a router
const router = Router();

/**
 * Generate recommendations for a file
 * POST /api/recommendations/generate
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const recommendations = await recommendationService.createRecommendation(fileId);
    
    return res.status(201).json({ recommendations });
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
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }
    
    const recommendations = await recommendationService.createBatchRecommendations(fileIds);
    
    return res.status(201).json({ recommendations });
  } catch (error) {
    console.error('Error generating batch recommendations:', error);
    next(error);
  }
});

/**
 * Get recommendations for a file
 * GET /api/recommendations/file/:fileId
 */
router.get('/file/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const recommendations = await storage.getFileRecommendations(fileId);
    
    return res.json({ recommendations });
  } catch (error) {
    console.error('Error getting file recommendations:', error);
    next(error);
  }
});

/**
 * Get recommendations by type
 * GET /api/recommendations/type/:type
 */
router.get('/type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    
    if (!type) {
      return res.status(400).json({ error: 'Recommendation type is required' });
    }
    
    const recommendations = await storage.getRecommendationsByType(type);
    
    return res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations by type:', error);
    next(error);
  }
});

/**
 * Mark a recommendation as implemented
 * PATCH /api/recommendations/:id/implement
 */
router.patch('/:id/implement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { implemented = true } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Recommendation ID is required' });
    }
    
    const recommendation = await storage.markRecommendationImplemented(id, implemented);
    
    return res.json({ recommendation });
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
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Recommendation ID is required' });
    }
    
    // Validate the request body against the schema
    const feedbackData = insertRecommendationFeedbackSchema.parse({
      ...req.body,
      recommendationId: id
    });
    
    const feedback = await storage.addRecommendationFeedback(feedbackData);
    
    return res.status(201).json({ feedback });
  } catch (error) {
    console.error('Error adding recommendation feedback:', error);
    next(error);
  }
});

export default router;