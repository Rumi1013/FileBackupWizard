import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from 'path';
import fs from 'fs/promises';
import { 
  insertFileOperationSchema, 
  insertLogSchema, 
  insertFileAssessmentSchema,
  insertMMFileSchema,
  insertMMFileAssessmentSchema,
  insertMMFileOperationSchema,
  insertPortfolioItemSchema,
  insertPortfolioMediaSchema,
  insertPortfolioTagSchema
} from "@shared/schema";
import { DatabaseStorage } from "./storage";
import multer from 'multer';
import recommendationRoutes from './recommendation-routes';
import previewRoutes from './preview-routes';
import githubRoutes from './github-routes';
import fileTagRoutes from './file-tag-routes';
import aiTagRoutes from './ai-tag-routes';

// List of supported file types
const VALID_FILE_TYPES = [
  // Documents
  '.txt', '.md', '.doc', '.docx', '.pdf', '.rtf', '.odt', '.tex',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif', '.ai', '.psd', '.eps',
  // Spreadsheets and data
  '.csv', '.xlsx', '.xls', '.json', '.xml', '.yaml', '.yml', '.numbers', '.ods',
  // Code and scripts
  '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.scss', '.less', '.php', '.rb', '.go', '.java', '.c', '.cpp', '.h',
  // Compressed files
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  // Video
  '.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv',
  // Design and creative files
  '.sketch', '.xd', '.fig', '.indd', '.ae', '.prproj', '.aep', '.afdesign', '.afphoto',
  // eBook and publishing
  '.epub', '.mobi', '.azw', '.azw3', '.ibooks',
  // Presentation files
  '.ppt', '.pptx', '.key', '.odp',
  // Midnight Magnolia specific
  '.mm-template', '.mm-workbook', '.mm-plan', '.mm-resource',
  // Others
  '.make', '.json', '.config', '.env', '.log', '.note'
];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/files/scan', async (req, res) => {
    try {
      let dirPath = req.query.path as string;
      
      // Create a list of special paths that we should handle
      const specialPaths: Record<string, string> = {
        '/': '/home/runner/workspace',
        '~': process.env.HOME || '/home/runner',
        'home': '/home/runner',
        'workspace': '/home/runner/workspace',
        'midnight-magnolia': '/home/runner/workspace/midnight-magnolia',
        // Mac-specific folder shortcuts
        'downloads': path.join(process.env.HOME || '/home/runner', 'Downloads'),
        'documents': path.join(process.env.HOME || '/home/runner', 'Documents'),
        'pictures': path.join(process.env.HOME || '/home/runner', 'Pictures'),
      };
      
      // Log the requested path for debugging
      console.log(`Path requested: ${dirPath}`);
      
      // Handle special path shortcuts
      if (dirPath && specialPaths.hasOwnProperty(dirPath)) {
        dirPath = specialPaths[dirPath];
        console.log(`Translating special path to: ${dirPath}`);
        
        await storage.addLog({
          level: 'info',
          message: `Translated special path to: ${dirPath}`
        });
      }
      
      // Handle home directory expansion paths with tilde (~)
      else if (dirPath && dirPath.startsWith('~/')) {
        const homePath = process.env.HOME || '/home/runner';
        dirPath = path.join(homePath, dirPath.substring(2));
        console.log(`Expanding home directory path to: ${dirPath}`);
        
        await storage.addLog({
          level: 'info',
          message: `Expanded home directory path to: ${dirPath}`
        });
      }
      
      // Handle macOS specific paths
      else if (dirPath && dirPath.includes('downloads')) {
        const homePath = process.env.HOME || '/home/runner';
        dirPath = path.join(homePath, 'Downloads');
        console.log(`MacOS Downloads path: ${dirPath}`);
      }
      else if (dirPath && dirPath.includes('documents')) {
        const homePath = process.env.HOME || '/home/runner';
        dirPath = path.join(homePath, 'Documents');
        console.log(`MacOS Documents path: ${dirPath}`);
      }
      else if (dirPath && dirPath.includes('pictures')) {
        const homePath = process.env.HOME || '/home/runner';
        dirPath = path.join(homePath, 'Pictures');
        console.log(`MacOS Pictures path: ${dirPath}`);
      }
      
      // Default to workspace directory if path is empty
      if (!dirPath) {
        dirPath = '/home/runner/workspace';
        console.log(`Defaulting to workspace directory`);
        
        await storage.addLog({
          level: 'info',
          message: `Defaulted to workspace directory`
        });
      }
      
      // Normalize path to ensure consistent format
      dirPath = path.normalize(dirPath);
      
      // Expand ~ to user's home directory if present
      if (dirPath.startsWith('~')) {
        dirPath = dirPath.replace('~', process.env.HOME || '/home/runner');
      }
      
      // Sanitize the path - restrict to user directories only, but with better messaging
      const restrictedDirs = ['/proc', '/sys', '/dev', '/tmp', '/etc', '/var/run', '/var/cache'];
      if (restrictedDirs.some(dir => dirPath.includes(dir))) {
        console.log(`Rejecting scan of restricted directory: ${dirPath}`);
        
        await storage.addLog({
          level: 'warn',
          message: `Rejected scan of restricted directory: ${dirPath}`
        });
        
        // Provide suggested alternatives for restricted paths
        let suggestedPath = '/home/runner/workspace';
        if (dirPath.includes('/tmp')) {
          suggestedPath = '/home/runner/workspace/temp';
        }
        
        return res.json({ 
          error: 'Access to system directories is restricted for security reasons',
          name: path.basename(dirPath),
          path: dirPath,
          type: 'directory',
          children: [],
          restricted: true,
          suggestion: `Try using ${suggestedPath} instead`,
          suggestedPath: suggestedPath
        });
      }
      
      // Check if the directory exists before scanning
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          return res.json({
            error: 'Not a directory',
            name: path.basename(dirPath),
            path: dirPath,
            type: 'file',
            children: []
          });
        }
      } catch (statError) {
        console.error(`Directory not found: ${dirPath}`);
        return res.json({
          error: `Directory not found: ${dirPath}`,
          name: path.basename(dirPath),
          path: dirPath,
          type: 'directory',
          children: []
        });
      }
      
      // Directory exists and is allowed, proceed with scanning
      console.log(`Scanning directory: ${dirPath}`);
      const result = await storage.scanDirectory(dirPath);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Scan error:', errorMessage);
      
      // Return a partial result with error info instead of a 500 status
      res.json({ 
        error: `Failed to scan directory: ${errorMessage}`,
        name: path.basename(req.query.path as string || './'),
        path: req.query.path as string || './',
        type: 'directory',
        children: [],
        error_details: errorMessage
      });
    }
  });
  
  // New endpoint for batch scanning of multiple directories
  app.post('/api/files/scan-batch', async (req, res) => {
    try {
      const { dirPaths } = req.body;
      
      if (!dirPaths || !Array.isArray(dirPaths) || dirPaths.length === 0) {
        return res.status(400).json({
          error: 'Invalid input: dirPaths must be a non-empty array of directory paths',
          success: false
        });
      }
      
      // Log the batch scan request
      console.log(`Batch scan request for ${dirPaths.length} directories`);
      await storage.addLog({
        level: 'info',
        message: `Batch scan requested for ${dirPaths.length} directories`
      });
      
      // Special paths mapping for batch operations
      const specialPaths: Record<string, string> = {
        '/': '/home/runner/workspace',
        '~': process.env.HOME || '/home/runner',
        'home': '/home/runner',
        'workspace': '/home/runner/workspace',
        'midnight-magnolia': '/home/runner/workspace/midnight-magnolia'
      };
      
      // Validate and filter out restricted directories
      const restrictedDirs = ['/proc', '/sys', '/dev', '/tmp', '/etc', '/var/run', '/var/cache'];
      const validatedPaths = dirPaths.map((dirPath: string) => {
        // Handle null or undefined paths
        if (!dirPath) {
          return '/home/runner/workspace';
        }
        
        // Handle special path shortcuts
        if (dirPath && specialPaths.hasOwnProperty(dirPath)) {
          return specialPaths[dirPath as keyof typeof specialPaths];
        }
        
        // Handle macOS specific paths
        if (dirPath.includes('~/Downloads')) {
          return path.join(process.env.HOME || '/home/runner', 'Downloads');
        }
        if (dirPath.includes('~/Documents')) {
          return path.join(process.env.HOME || '/home/runner', 'Documents');
        }
        if (dirPath.includes('~/Pictures')) {
          return path.join(process.env.HOME || '/home/runner', 'Pictures');
        }
        
        // Normalize the path
        let normalizedPath = path.normalize(dirPath);
        
        // Expand ~ to user's home directory if present
        if (normalizedPath.startsWith('~')) {
          normalizedPath = normalizedPath.replace('~', process.env.HOME || '/home/runner');
        }
        
        // Mark restricted directories
        if (restrictedDirs.some(dir => normalizedPath.includes(dir))) {
          return { path: normalizedPath, restricted: true };
        }
        
        return normalizedPath;
      });
      
      // Filter out restricted directories and extract clean paths
      const cleanPaths: string[] = [];
      const skippedPaths: any[] = [];
      
      validatedPaths.forEach(item => {
        if (typeof item === 'string') {
          cleanPaths.push(item);
        } else if (item.restricted) {
          skippedPaths.push({
            path: item.path,
            reason: 'Access to system directories is restricted'
          });
        }
      });
      
      // If we have no valid paths after filtering, return an error
      if (cleanPaths.length === 0) {
        return res.status(400).json({
          error: 'No valid directory paths provided after filtering restricted directories',
          skippedPaths,
          success: false
        });
      }
      
      // Perform batch scan with validated paths
      const results = await storage.scanMultipleDirectories(cleanPaths);
      
      // Prepare response with both results and skipped paths
      const response = {
        success: true,
        scannedCount: Object.keys(results).length,
        skippedCount: skippedPaths.length,
        skippedPaths: skippedPaths.length > 0 ? skippedPaths : undefined,
        results
      };
      
      res.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Batch scan error:', errorMessage);
      
      await storage.addLog({
        level: 'error',
        message: `Batch scan failed: ${errorMessage}`
      });
      
      res.status(500).json({
        error: `Failed to perform batch scan: ${errorMessage}`,
        success: false
      });
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

      let directory = req.body.directory || '';
      console.log('Upload request:', { originalDirectory: directory, filename: req.file.originalname });

      if (!storage.isValidFileType(req.file.originalname)) {
        return res.status(400).json({ 
          error: 'Invalid file type',
          supported_types: VALID_FILE_TYPES,
          message: 'Please upload one of the supported file types'
        });
      }

      // Handle special paths for upload destination
      const specialPaths: Record<string, string> = {
        '/': '/uploads/root',
        '~': '/uploads/home',
        'downloads': '/uploads/downloads',
        'documents': '/uploads/documents',
        'pictures': '/uploads/pictures',
        '/workspace': '/uploads/workspace',
      };

      // Check if this is a special path and normalize it
      if (specialPaths[directory]) {
        directory = specialPaths[directory].replace('/uploads/', '');
        console.log('Mapped special path to upload directory:', directory);
      }

      // Create directory if it doesn't exist yet
      try {
        await storage.createDirectory(path.join(process.cwd(), 'uploads', directory));
      } catch (dirError) {
        console.error('Error creating directory:', dirError);
        // Continue anyway, the storage.uploadFile method will also try to create it
      }

      const result = await storage.uploadFile(req.file, directory);
      console.log('Upload success:', result);
      res.json(result);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('File too large')) {
        return res.status(413).json({ error: 'File size exceeds the 10MB limit' });
      }
      
      res.status(500).json({ 
        error: 'Upload failed', 
        details: errorMessage,
        suggestion: 'Please try uploading a smaller file or a different file type'
      });
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
        level: 'info',
        message: `Applied organization rules to ${filePath}`
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
        level: 'error',
        message: `Failed to apply organization rules: ${error}`
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
        level: 'info',
        message: `Batch organization applied to ${results.length} files (${errors.length} failed)`
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
        level: 'error',
        message: `Batch organization failed: ${error}`
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
        level: 'info',
        message: `Quality filter applied: ${qualityLevel}${fileType ? ', type: ' + fileType : ''} - Found ${filteredFiles.length} files`
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

  // =============================================
  // MIDNIGHT MAGNOLIA INTEGRATION API ENDPOINTS
  // =============================================
  
  // Create an instance of DatabaseStorage for the integration endpoints
  const dbStorage = new DatabaseStorage();
  
  // MM File Manager API endpoints
  
  // Get all files
  app.get('/api/mm/files', async (req, res) => {
    try {
      const files = await dbStorage.getMMFiles();
      res.json(files);
    } catch (error) {
      console.error('MM Files error:', error);
      res.status(500).json({ error: `Failed to get MM files: ${error}` });
    }
  });
  
  // Get file by ID
  app.get('/api/mm/files/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const file = await dbStorage.getMMFileById(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      console.error('MM File retrieval error:', error);
      res.status(500).json({ error: `Failed to get MM file: ${error}` });
    }
  });
  
  // Upload file to MM 
  app.post('/api/mm/files', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const directory = req.body.directory || '';
      
      if (!dbStorage.isValidFileType(req.file.originalname)) {
        return res.status(400).json({ 
          error: 'Invalid file type',
          supported_types: VALID_FILE_TYPES,
          message: 'Please upload one of the supported file types'
        });
      }
      
      // Create directory if it doesn't exist yet
      try {
        await dbStorage.createDirectory(path.join(process.cwd(), 'uploads', directory));
      } catch (dirError) {
        console.error('Error creating directory:', dirError);
        // Continue anyway, the storage.uploadFile method will also try to create it
      }
      
      const result = await dbStorage.uploadFile(req.file, directory);
      res.json(result);
    } catch (error) {
      console.error('MM Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('File too large')) {
        return res.status(413).json({ error: 'File size exceeds the 10MB limit' });
      }
      
      res.status(500).json({ 
        error: 'Upload failed', 
        details: errorMessage,
        suggestion: 'Please try uploading a smaller file or a different file type'
      });
    }
  });
  
  // File assessment endpoints
  
  // Get all file assessments
  app.get('/api/mm/assessments', async (req, res) => {
    try {
      const assessments = await dbStorage.getMMFileAssessments();
      res.json(assessments);
    } catch (error) {
      console.error('MM Assessments error:', error);
      res.status(500).json({ error: `Failed to get MM assessments: ${error}` });
    }
  });
  
  // Assess a file
  app.post('/api/mm/assess', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }
      
      const assessment = await dbStorage.assessFile(filePath);
      await dbStorage.applyOrganizationRules(filePath);
      
      res.json(assessment);
    } catch (error) {
      console.error('MM Assessment error:', error);
      res.status(500).json({ error: `Failed to assess MM file: ${error}` });
    }
  });
  
  // Portfolio Integration API endpoints
  
  // Get all portfolio items
  app.get('/api/portfolio/items', async (req, res) => {
    try {
      const items = await dbStorage.getPortfolioItems();
      res.json(items);
    } catch (error) {
      console.error('Portfolio items error:', error);
      res.status(500).json({ error: `Failed to get portfolio items: ${error}` });
    }
  });
  
  // Get portfolio item by ID
  app.get('/api/portfolio/items/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const item = await dbStorage.getPortfolioItemById(id);
      
      if (!item) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Portfolio item retrieval error:', error);
      res.status(500).json({ error: `Failed to get portfolio item: ${error}` });
    }
  });
  
  // Create portfolio item
  app.post('/api/portfolio/items', async (req, res) => {
    try {
      const portfolioItem = insertPortfolioItemSchema.parse(req.body);
      const result = await dbStorage.addPortfolioItem(portfolioItem);
      res.status(201).json(result);
    } catch (error) {
      console.error('Create portfolio item error:', error);
      res.status(500).json({ error: `Failed to create portfolio item: ${error}` });
    }
  });
  
  // Add media to portfolio item
  app.post('/api/portfolio/:portfolioId/media', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const portfolioId = req.params.portfolioId;
      
      // Ensure portfolio item exists
      const portfolioItem = await dbStorage.getPortfolioItemById(portfolioId);
      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      
      // Upload the file
      const uploadedFile = await dbStorage.uploadFile(req.file, `portfolio/${portfolioId}`);
      
      // Create media record
      const mediaData: any = {
        portfolioItemId: portfolioId,
        mediaType: req.body.mediaType || 'image',
        url: uploadedFile.targetPath,
        thumbnailUrl: req.body.thumbnailUrl || null,
        orderIndex: parseInt(req.body.orderIndex || '0')
      };
      
      const media = await dbStorage.addPortfolioMedia(mediaData);
      res.status(201).json(media);
    } catch (error) {
      console.error('Add portfolio media error:', error);
      res.status(500).json({ error: `Failed to add portfolio media: ${error}` });
    }
  });
  
  // Add tag to portfolio item
  app.post('/api/portfolio/:portfolioId/tags', async (req, res) => {
    try {
      const portfolioId = req.params.portfolioId;
      
      // Ensure portfolio item exists
      const portfolioItem = await dbStorage.getPortfolioItemById(portfolioId);
      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      
      const { tag } = req.body;
      if (!tag) {
        return res.status(400).json({ error: 'Tag is required' });
      }
      
      const tagData = {
        portfolioItemId: portfolioId,
        tag
      };
      
      const result = await dbStorage.addPortfolioTag(tagData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Add portfolio tag error:', error);
      res.status(500).json({ error: `Failed to add portfolio tag: ${error}` });
    }
  });

  // Register recommendation routes
  app.use('/api/recommendations', recommendationRoutes);
  
  // Register file preview routes
  app.use('/api/previews', previewRoutes);
  
  // Register GitHub repository management routes
  app.use('/api/github', githubRoutes);
  
  // Register file tag routes (emoji-based tagging system)
  app.use('/api/tags', fileTagRoutes);
  
  // Register AI tag recommendation routes
  app.use('/api/ai-tags', aiTagRoutes);

  const httpServer = createServer(app);
  return httpServer;
}