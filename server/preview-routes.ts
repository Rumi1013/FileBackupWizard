import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { z } from "zod";
import path from 'path';
import fs from 'fs/promises';

const router = Router();

/**
 * Get preview for a file by its path
 * GET /api/previews/file
 */
router.get('/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      filePath: z.string().min(1),
      previewType: z.enum(['text', 'image', 'binary']).optional().default('text')
    });

    const query = schema.safeParse(req.query);
    
    if (!query.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: query.error.format()
      });
    }

    const { filePath, previewType } = query.data;
    
    // Ensure the file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        details: `The file at path ${filePath} was not found`
      });
    }

    const preview = await storage.getFilePreview(filePath, previewType);
    
    return res.json(preview);
  } catch (error) {
    next(error);
  }
});

/**
 * Get preview for a file by its ID
 * GET /api/previews/id/:fileId
 */
router.get('/id/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const previewType = req.query.previewType as string || 'text';
    
    if (!fileId) {
      return res.status(400).json({
        error: 'Missing file ID',
        details: 'A file ID must be provided'
      });
    }

    try {
      const preview = await storage.getFilePreviewById(fileId, previewType);
      return res.json(preview);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        details: `No file found with ID ${fileId}`
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Create a preview for a file with specified settings
 * POST /api/previews/create
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      filePath: z.string().min(1),
      previewType: z.enum(['text', 'image', 'binary']).optional().default('text')
    });

    const body = schema.safeParse(req.body);
    
    if (!body.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: body.error.format()
      });
    }

    const { filePath, previewType } = body.data;
    
    // Ensure the file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        details: `The file at path ${filePath} was not found`
      });
    }

    const preview = await storage.getFilePreview(filePath, previewType);
    
    return res.status(201).json(preview);
  } catch (error) {
    next(error);
  }
});

export default router;