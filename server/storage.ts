import { fileOperations, logs, contentAnalysis, type FileOperation, type InsertFileOperation, type Log, type InsertLog, type DirectoryEntry, type ContentAnalysis, type InsertContentAnalysis, type ContentSuggestion } from "@shared/schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import type { Multer } from 'multer';

export interface IStorage {
  addFileOperation(operation: InsertFileOperation): Promise<FileOperation>;
  getFileOperations(): Promise<FileOperation[]>;
  addLog(log: InsertLog): Promise<Log>;
  getLogs(): Promise<Log[]>;
  scanDirectory(dirPath: string): Promise<DirectoryEntry>;
  analyzeContent(filePath: string): Promise<ContentAnalysis>;
  getContentAnalysis(filePath: string): Promise<ContentAnalysis | null>;
  uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation>;
  createDirectory(dirPath: string): Promise<void>;
  isValidFileType(filename: string): boolean;
}

const VALID_FILE_TYPES = [
  '.txt', '.md', '.doc', '.docx', '.pdf',
  '.jpg', '.jpeg', '.png', '.gif',
  '.csv', '.xlsx', '.xls'
];

export class MemStorage implements IStorage {
  private fileOps: Map<number, FileOperation>;
  private logEntries: Map<number, Log>;
  private analysisEntries: Map<number, ContentAnalysis>;
  private currentFileOpId: number;
  private currentLogId: number;
  private currentAnalysisId: number;

  constructor() {
    this.fileOps = new Map();
    this.logEntries = new Map();
    this.analysisEntries = new Map();
    this.currentFileOpId = 1;
    this.currentLogId = 1;
    this.currentAnalysisId = 1;
  }

  isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return VALID_FILE_TYPES.includes(ext);
  }

  async addFileOperation(operation: InsertFileOperation): Promise<FileOperation> {
    const id = this.currentFileOpId++;
    const fileOp: FileOperation = {
      ...operation,
      id,
      timestamp: new Date(),
      targetPath: operation.targetPath || null
    };
    this.fileOps.set(id, fileOp);
    await this.addLog({
      level: 'info',
      message: `File operation completed: ${operation.operationType} - ${operation.sourcePath}`
    });
    return fileOp;
  }

  async getFileOperations(): Promise<FileOperation[]> {
    return Array.from(this.fileOps.values());
  }

  async addLog(log: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    const logEntry: Log = {
      ...log,
      id,
      timestamp: new Date()
    };
    this.logEntries.set(id, logEntry);
    return logEntry;
  }

  async getLogs(): Promise<Log[]> {
    const logs = Array.from(this.logEntries.values());
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async scanDirectory(dirPath: string): Promise<DirectoryEntry> {
    try {
      const execAsync = promisify(exec);
      const pythonScript = path.join(process.cwd(), 'file_scanner.py');
      const normalizedPath = path.normalize(dirPath);

      await this.addLog({
        level: 'info',
        message: `Scanning directory: ${normalizedPath}`
      });

      const { stdout, stderr } = await execAsync(`python ${pythonScript} --dir "${normalizedPath}"`);

      if (stderr) {
        await this.addLog({
          level: 'error',
          message: `Scanner error: ${stderr}`
        });
      }

      let result;
      try {
        result = JSON.parse(stdout);
      } catch (e) {
        await this.addLog({
          level: 'error',
          message: `Failed to parse scanner output: ${stdout}`
        });
        throw new Error('Invalid scanner output');
      }

      if ('error' in result) {
        await this.addLog({
          level: 'error',
          message: `Scan failed: ${result.error}`
        });
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to scan directory: ${error}`
      });
      throw error;
    }
  }

  async analyzeContent(filePath: string): Promise<ContentAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileStats = await fs.stat(filePath);
      const fileExt = path.extname(filePath).toLowerCase();

      // Enhanced mock AI analysis with more relevant suggestions
      const suggestions: ContentSuggestion[] = [
        {
          category: 'readability',
          priority: 'high',
          suggestion: 'Consider breaking down long paragraphs',
          reason: 'Improves reading comprehension for ADHD readers'
        },
        {
          category: 'organization',
          priority: 'medium',
          suggestion: 'Add clear section headers and bullet points',
          reason: 'Helps with content navigation and information retention'
        },
        {
          category: 'readability',
          priority: 'high',
          suggestion: 'Use shorter sentences and simpler words',
          reason: 'Reduces cognitive load for neurodivergent readers'
        }
      ];

      const analysis: ContentAnalysis = {
        id: this.currentAnalysisId++,
        filePath,
        readabilityScore: this.calculateReadabilityScore(content),
        suggestions: suggestions,
        organizationTips: [
          'Use bullet points for lists',
          'Add visual breaks between sections',
          'Highlight key information',
          'Include a summary at the beginning'
        ],
        timestamp: new Date()
      };

      this.analysisEntries.set(analysis.id, analysis);
      return analysis;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to analyze content: ${error}`
      });
      throw new Error(`Failed to analyze content: ${error}`);
    }
  }

  private calculateReadabilityScore(content: string): string {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;

    if (avgWordsPerSentence > 25) return 'Complex';
    if (avgWordsPerSentence > 15) return 'Moderate';
    return 'Easy';
  }

  async getContentAnalysis(filePath: string): Promise<ContentAnalysis | null> {
    const analysis = Array.from(this.analysisEntries.values()).find(
      (a) => a.filePath === filePath
    );
    return analysis || null;
  }

  async uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation> {
    try {
      if (!this.isValidFileType(file.originalname)) {
        throw new Error('Invalid file type');
      }

      // Ensure we use a safe directory path
      const baseUploadDir = path.join(process.cwd(), 'uploads');
      const uploadDir = path.join(baseUploadDir, directory);

      // Create base upload directory first
      await this.createDirectory(baseUploadDir);
      // Then create subdirectory if needed
      await this.createDirectory(uploadDir);

      // Create a safe filename
      const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);

      // Write file and create operation record
      await fs.writeFile(filePath, file.buffer);

      // Log successful upload
      await this.addLog({
        level: 'info',
        message: `File uploaded successfully: ${fileName}`
      });

      const operation: InsertFileOperation = {
        sourcePath: file.originalname,
        targetPath: filePath,
        operationType: 'upload',
        status: 'completed'
      };
      return this.addFileOperation(operation);
    } catch (error) {
      // Log error
      await this.addLog({
        level: 'error',
        message: `Failed to upload file: ${error}`
      });
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  }
}

export const storage = new MemStorage();