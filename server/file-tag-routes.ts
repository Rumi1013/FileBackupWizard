import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { z } from 'zod';

const router = Router();

// Schema for file tag validation
const fileTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  emoji: z.string().min(1, "Emoji is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
  description: z.string().optional()
});

// Schema for tag to file mapping validation
const tagMappingSchema = z.object({
  fileId: z.string().uuid("File ID must be a valid UUID"),
  tagId: z.string().uuid("Tag ID must be a valid UUID")
});

/**
 * Create a new file tag
 * POST /api/tags
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = fileTagSchema.parse(req.body);
    const newTag = await storage.createFileTag(validatedData);
    
    res.status(201).json({
      success: true,
      data: newTag
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all file tags
 * GET /api/tags
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await storage.getFileTags();
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a file tag by ID
 * GET /api/tags/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tag = await storage.getFileTag(id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        error: `Tag with ID ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: tag
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a file tag
 * PATCH /api/tags/:id
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = fileTagSchema.partial().parse(req.body);
    
    const tag = await storage.getFileTag(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        error: `Tag with ID ${id} not found`
      });
    }
    
    const updatedTag = await storage.updateFileTag(id, validatedData);
    
    res.json({
      success: true,
      data: updatedTag
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a file tag
 * DELETE /api/tags/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteFileTag(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Tag with ID ${id} not found`
      });
    }
    
    res.json({
      success: true,
      message: `Tag with ID ${id} has been deleted`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add a tag to a file
 * POST /api/tags/map
 */
router.post('/map', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = tagMappingSchema.parse(req.body);
    const mapping = await storage.addTagToFile(validatedData);
    
    res.status(201).json({
      success: true,
      data: mapping
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove a tag from a file
 * DELETE /api/tags/map/:fileId/:tagId
 */
router.delete('/map/:fileId/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId, tagId } = req.params;
    const removed = await storage.removeTagFromFile(fileId, tagId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: `Mapping for file ID ${fileId} and tag ID ${tagId} not found`
      });
    }
    
    res.json({
      success: true,
      message: `Tag removed from file successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all files with a specific tag
 * GET /api/tags/:id/files
 */
router.get('/:id/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const files = await storage.getFilesWithTag(id);
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all tags for a specific file
 * GET /api/tags/file/:fileId
 */
router.get('/file/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const tags = await storage.getTagsForFile(fileId);
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    next(error);
  }
});

export default router;