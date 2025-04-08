import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileOperationSchema, insertLogSchema, insertFileAssessmentSchema } from "@shared/schema";
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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
      console.error('Scan error:', error);
      res.status(500).json({ error: `Failed to scan directory: ${error}` });
    }
  });

  app.get('/api/operations', async (req, res) => {
    try {
      const operations = await storage.getFileOperations();
      res.json(operations);
    } catch (error) {
      console.error('Operations error:', error);
      res.status(500).json({ error: `Failed to get operations: ${error}` });
    }
  });

  app.post('/api/operations', async (req, res) => {
    try {
      const operation = insertFileOperationSchema.parse(req.body);
      const result = await storage.addFileOperation(operation);
      res.json(result);
    } catch (error) {
      console.error('Add operation error:', error);
      res.status(500).json({ error: `Failed to add operation: ${error}` });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      console.error('Logs error:', error);
      res.status(500).json({ error: `Failed to get logs: ${error}` });
    }
  });

  app.post('/api/logs', async (req, res) => {
    try {
      const log = insertLogSchema.parse(req.body);
      const result = await storage.addLog(log);
      res.json(result);
    } catch (error) {
      console.error('Add log error:', error);
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
      console.error('Analysis error:', error);
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
      console.error('Get analysis error:', error);
      res.status(500).json({ error: `Failed to get analysis: ${error}` });
    }
  });

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const directory = req.body.directory || '';
      console.log('Upload request:', { directory, filename: req.file.originalname });

      if (!storage.isValidFileType(req.file.originalname)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Supported types: txt, md, doc, docx, pdf, jpg, jpeg, png, gif, csv, xlsx, xls' 
        });
      }

      const result = await storage.uploadFile(req.file, directory);
      console.log('Upload success:', result);
      res.json(result);
    } catch (error) {
      console.error('Upload error:', error);
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: 'File size exceeds the 10MB limit' });
      }
      res.status(500).json({ error: `Upload failed: ${error}` });
    }
  });

  app.post('/api/assess', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }
      const result = await storage.assessFile(filePath);
      await storage.applyOrganizationRules(filePath);
      res.json(result);
    } catch (error) {
      console.error('Assessment error:', error);
      res.status(500).json({ error: `Failed to assess file: ${error}` });
    }
  });

  app.get('/api/assessment/:filePath', async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.filePath);
      const result = await storage.assessFile(filePath);
      res.json(result);
    } catch (error) {
      console.error('Get assessment error:', error);
      res.status(500).json({ error: `Failed to get assessment: ${error}` });
    }
  });

  app.get('/api/daily-report', async (req, res) => {
    try {
      const report = await storage.generateDailyReport();
      res.json(report);
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({ error: `Failed to generate report: ${error}` });
    }
  });

  // New route to explicitly apply organization rules to a file
  app.post('/api/organize', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }
      
      await storage.applyOrganizationRules(filePath);
      
      // Log the organization operation
      await storage.addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Applied organization rules to ${filePath}`,
        source: 'file-organizer'
      });
      
      res.json({ 
        success: true, 
        message: 'File organization rules applied successfully',
        filePath
      });
    } catch (error) {
      console.error('Organization error:', error);
      
      // Log the error
      await storage.addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to apply organization rules: ${error}`,
        source: 'file-organizer'
      });
      
      res.status(500).json({ error: `Failed to apply organization rules: ${error}` });
    }
  });

  // Batch apply organization rules to multiple files
  app.post('/api/organize-batch', async (req, res) => {
    try {
      const { filePaths } = req.body;
      if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
        return res.status(400).json({ error: 'No file paths provided or invalid format' });
      }

      const results = [];
      const errors = [];

      // Process each file
      for (const filePath of filePaths) {
        try {
          await storage.applyOrganizationRules(filePath);
          results.push({ filePath, success: true });
        } catch (err: any) {
          errors.push({ filePath, error: err.message });
        }
      }

      // Log the batch operation
      await storage.addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Batch organization applied to ${results.length} files (${errors.length} failed)`,
        source: 'file-organizer'
      });

      res.json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error) {
      console.error('Batch organization error:', error);
      
      await storage.addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Batch organization failed: ${error}`,
        source: 'file-organizer'
      });
      
      res.status(500).json({ error: `Failed to apply batch organization: ${error}` });
    }
  });

  // Get files by quality level
  app.get('/api/files/quality/:qualityLevel', async (req, res) => {
    try {
      const qualityLevel = req.params.qualityLevel;
      const fileType = req.query.type as string | undefined;
      
      if (!qualityLevel) {
        return res.status(400).json({ error: 'Quality level is required' });
      }
      
      // Scan root directory
      const allFiles = await storage.scanDirectory('./');
      
      // Helper function to flatten directory structure
      const flattenDirectoryStructure = (dir: any, files: any[] = []): any[] => {
        if (dir.type === 'file') {
          files.push(dir);
        } else if (dir.children && Array.isArray(dir.children)) {
          for (const child of dir.children) {
            flattenDirectoryStructure(child, files);
          }
        }
        return files;
      };
      
      const fileList = flattenDirectoryStructure(allFiles);
      
      // Filter files by quality and file type
      const filteredFiles = fileList.filter(file => {
        // Skip files without assessment
        if (!file.assessment) return false;
        
        // Filter by quality level
        if (file.assessment.qualityScore !== qualityLevel) {
          return false;
        }
        
        // Filter by file type if specified
        if (fileType && !file.assessment.fileType.toLowerCase().includes(fileType.toLowerCase())) {
          return false;
        }
        
        return true;
      });
      
      // Add log
      await storage.addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Quality filter applied: ${qualityLevel}${fileType ? ', type: ' + fileType : ''} - Found ${filteredFiles.length} files`,
        source: 'quality-filter'
      });
      
      res.json({
        success: true,
        count: filteredFiles.length,
        files: filteredFiles
      });
    } catch (error) {
      console.error('Quality filter error:', error);
      res.status(500).json({ error: `Failed to apply quality filter: ${error}` });
    }
  });

  // Get files eligible for monetization
  app.get('/api/files/monetization', async (req, res) => {
    try {
      // Scan root directory
      const allFiles = await storage.scanDirectory('./');
      
      // Helper function to flatten directory structure
      const flattenDirectoryStructure = (dir: any, files: any[] = []): any[] => {
        if (dir.type === 'file') {
          files.push(dir);
        } else if (dir.children && Array.isArray(dir.children)) {
          for (const child of dir.children) {
            flattenDirectoryStructure(child, files);
          }
        }
        return files;
      };
      
      const fileList = flattenDirectoryStructure(allFiles);
      
      // Filter files eligible for monetization
      const monetizableCandidates = fileList.filter(file => {
        return file.assessment && file.assessment.monetizationEligible === true;
      });
      
      res.json({
        success: true,
        count: monetizableCandidates.length,
        files: monetizableCandidates
      });
    } catch (error) {
      console.error('Monetization candidates error:', error);
      res.status(500).json({ error: `Failed to find monetization candidates: ${error}` });
    }
  });

  // Get files marked for deletion
  app.get('/api/files/deletion', async (req, res) => {
    try {
      // Scan root directory
      const allFiles = await storage.scanDirectory('./');
      
      // Helper function to flatten directory structure
      const flattenDirectoryStructure = (dir: any, files: any[] = []): any[] => {
        if (dir.type === 'file') {
          files.push(dir);
        } else if (dir.children && Array.isArray(dir.children)) {
          for (const child of dir.children) {
            flattenDirectoryStructure(child, files);
          }
        }
        return files;
      };
      
      const fileList = flattenDirectoryStructure(allFiles);
      
      // Filter files marked for deletion
      const deletionCandidates = fileList.filter(file => {
        return file.assessment && file.assessment.needsDeletion === true;
      });
      
      res.json({
        success: true,
        count: deletionCandidates.length,
        files: deletionCandidates
      });
    } catch (error) {
      console.error('Deletion candidates error:', error);
      res.status(500).json({ error: `Failed to find deletion candidates: ${error}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}