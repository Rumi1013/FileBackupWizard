import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileOperationSchema, insertLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/files/scan', async (req, res) => {
    try {
      const dirPath = req.query.path as string;
      if (!dirPath) {
        return res.status(400).json({ error: 'Directory path is required' });
      }
      const result = await storage.scanDirectory(dirPath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: `Failed to scan directory: ${error}` });
    }
  });

  app.get('/api/operations', async (req, res) => {
    try {
      const operations = await storage.getFileOperations();
      res.json(operations);
    } catch (error) {
      res.status(500).json({ error: `Failed to get operations: ${error}` });
    }
  });

  app.post('/api/operations', async (req, res) => {
    try {
      const operation = insertFileOperationSchema.parse(req.body);
      const result = await storage.addFileOperation(operation);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: `Failed to add operation: ${error}` });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: `Failed to get logs: ${error}` });
    }
  });

  app.post('/api/logs', async (req, res) => {
    try {
      const log = insertLogSchema.parse(req.body);
      const result = await storage.addLog(log);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: `Failed to add log: ${error}` });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }
      const result = await storage.analyzeContent(filePath);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: `Failed to analyze content: ${error}` });
    }
  });

  app.get('/api/analysis/:filePath', async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.filePath);
      const result = await storage.getContentAnalysis(filePath);
      if (!result) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: `Failed to get analysis: ${error}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}