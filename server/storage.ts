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
}

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

  async addFileOperation(operation: InsertFileOperation): Promise<FileOperation> {
    const id = this.currentFileOpId++;
    const fileOp: FileOperation = {
      ...operation,
      id,
      timestamp: new Date(),
      targetPath: operation.targetPath || null
    };
    this.fileOps.set(id, fileOp);
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
    return Array.from(this.logEntries.values());
  }

  async scanDirectory(dirPath: string): Promise<DirectoryEntry> {
    const execAsync = promisify(exec);
    const pythonScript = path.join(process.cwd(), 'file_scanner.py');

    try {
      const { stdout } = await execAsync(`python ${pythonScript} --dir "${dirPath}"`);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to scan directory: ${error}`);
    }
  }

  async analyzeContent(filePath: string): Promise<ContentAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Mock AI analysis - In real implementation, this would call an AI service
      const suggestions: ContentSuggestion[] = [
        {
          category: 'readability',
          priority: 'high',
          suggestion: 'Consider breaking down long paragraphs',
          reason: 'Improves focus for ADHD readers'
        },
        {
          category: 'organization',
          priority: 'medium',
          suggestion: 'Add clear section headers',
          reason: 'Helps with content navigation'
        }
      ];

      const analysis: ContentAnalysis = {
        id: this.currentAnalysisId++,
        filePath,
        readabilityScore: 'Good',
        suggestions: suggestions,
        organizationTips: [
          'Use bullet points for lists',
          'Add visual breaks between sections'
        ],
        timestamp: new Date()
      };

      this.analysisEntries.set(analysis.id, analysis);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze content: ${error}`);
    }
  }

  async getContentAnalysis(filePath: string): Promise<ContentAnalysis | null> {
    const analysis = Array.from(this.analysisEntries.values()).find(
      (a) => a.filePath === filePath
    );
    return analysis || null;
  }

  async uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation> {
    try {
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