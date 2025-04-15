import { 
  fileOperations, logs, 
  mmFiles, mmFileAssessments, mmFileOperations, portfolioItems, portfolioMedia, portfolioTags,
  type FileOperation, type InsertFileOperation, 
  type Log, type InsertLog, 
  type DirectoryEntry, 
  type FileAssessment, type InsertFileAssessment, 
  type DailyReport, type InsertDailyReport, 
  type QualityMetrics, type FileOrganizationRules,
  type ContentAnalysis, type ContentSuggestion,
  // Midnight Magnolia Integration Types
  type MMFile, type InsertMMFile,
  type MMFileAssessment, type InsertMMFileAssessment,
  type MMFileOperation, type InsertMMFileOperation,
  type PortfolioItem, type InsertPortfolioItem,
  type PortfolioMedia, type InsertPortfolioMedia,
  type PortfolioTag, type InsertPortfolioTag
} from "@shared/schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { Stats } from 'fs';
import type { Multer } from 'multer';
import { db } from './db';
import { eq, asc, desc } from 'drizzle-orm';

export interface IStorage {
  addFileOperation(operation: InsertFileOperation): Promise<FileOperation>;
  getFileOperations(): Promise<FileOperation[]>;
  addLog(log: InsertLog): Promise<Log>;
  getLogs(): Promise<Log[]>;
  scanDirectory(dirPath: string): Promise<DirectoryEntry>;
  assessFile(filePath: string): Promise<FileAssessment>;
  generateDailyReport(): Promise<DailyReport>;
  uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation>;
  createDirectory(dirPath: string): Promise<void>;
  isValidFileType(filename: string): boolean;
  applyOrganizationRules(filePath: string): Promise<void>;
}

const VALID_FILE_TYPES = [
  '.txt', '.md', '.doc', '.docx', '.pdf',
  '.jpg', '.jpeg', '.png', '.gif',
  '.csv', '.xlsx', '.xls'
];

const FILE_ORGANIZATION_RULES: FileOrganizationRules = {
  qualityThresholds: {
    code: 0.7,
    documents: 0.6,
    images: 0.5,
    videos: 0.6
  },
  monetizationCriteria: {
    minQualityScore: 0.8,
    requiredMetadata: ['title', 'description', 'keywords'],
    contentTypes: ['.md', '.doc', '.docx', '.pdf', '.mp4', '.mov']
  },
  deletionRules: {
    ageThreshold: 90, // days
    sizeThreshold: 100 * 1024 * 1024, // 100MB
    qualityThreshold: 0.3
  }
};

export class MemStorage implements IStorage {
  private fileOps: Map<number, FileOperation>;
  private logEntries: Map<number, Log>;
  private analysisEntries: Map<number, ContentAnalysis>;
  private fileAssessments: Map<number, FileAssessment>;
  private dailyReports: Map<number, DailyReport>;
  private currentFileOpId: number;
  private currentLogId: number;
  private currentAnalysisId: number;
  private currentAssessmentId: number;
  private currentReportId: number;

  constructor() {
    this.fileOps = new Map();
    this.logEntries = new Map();
    this.analysisEntries = new Map();
    this.fileAssessments = new Map();
    this.dailyReports = new Map();
    this.currentFileOpId = 1;
    this.currentLogId = 1;
    this.currentAnalysisId = 1;
    this.currentAssessmentId = 1;
    this.currentReportId = 1;
  }

  isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return VALID_FILE_TYPES.includes(ext);
  }

  private async assessFileQuality(filePath: string): Promise<QualityMetrics> {
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    let metrics: QualityMetrics = {};

    // Code quality assessment
    if (['.js', '.ts', '.py', '.jsx', '.tsx'].includes(ext)) {
      metrics.codeQuality = {
        lintingScore: 0.8, // Mock score
        complexity: 0.7,
        documentation: content.includes('/**') ? 0.9 : 0.4
      };
    }

    // Document quality assessment
    if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) {
      const readabilityString = this.calculateReadabilityScore(content);
      let readabilityScore = 0.5; // default value
      
      // Convert string score to numerical value
      if (readabilityString === 'Easy') readabilityScore = 0.9;
      else if (readabilityString === 'Moderate') readabilityScore = 0.6;
      else if (readabilityString === 'Complex') readabilityScore = 0.3;
      
      metrics.documentQuality = {
        readability: readabilityScore,
        formatting: 0.8,
        completeness: 0.7
      };
    }

    return metrics;
  }

  async assessFile(filePath: string): Promise<FileAssessment> {
    try {
      const stats = await fs.stat(filePath);
      const metrics = await this.assessFileQuality(filePath);

      const assessment: InsertFileAssessment = {
        filePath,
        fileType: path.extname(filePath).toLowerCase(),
        qualityScore: this.calculateOverallQuality(metrics),
        monetizationEligible: this.checkMonetizationEligibility(filePath, metrics),
        needsDeletion: this.checkDeletionNeeded(stats, metrics),
        metadata: metrics,
        lastModified: stats.mtime || null,
        size: stats.size.toString()
      };

      const id = this.currentAssessmentId++;
      const fullAssessment: FileAssessment = {
        ...assessment,
        id,
        assessmentDate: new Date()
      };

      this.fileAssessments.set(id, fullAssessment);
      return fullAssessment;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to assess file: ${error}`
      });
      throw error;
    }
  }

  private calculateOverallQuality(metrics: QualityMetrics): string {
    // Implement quality calculation logic based on metrics
    return 'Good'; // Mock implementation
  }

  private checkMonetizationEligibility(filePath: string, metrics: QualityMetrics): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return FILE_ORGANIZATION_RULES.monetizationCriteria.contentTypes.includes(ext);
  }

  private checkDeletionNeeded(stats: fs.Stats, metrics: QualityMetrics): boolean {
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > FILE_ORGANIZATION_RULES.deletionRules.ageThreshold;
  }

  async generateDailyReport(): Promise<DailyReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysAssessments = Array.from(this.fileAssessments.values())
      .filter(assessment => {
        const assessmentDate = new Date(assessment.assessmentDate);
        assessmentDate.setHours(0, 0, 0, 0);
        return assessmentDate.getTime() === today.getTime();
      });

    const report: InsertDailyReport = {
      date: today,
      filesProcessed: todaysAssessments.map(a => ({
        path: a.filePath,
        type: a.fileType,
        quality: a.qualityScore
      })),
      deletions: todaysAssessments
        .filter(a => a.needsDeletion)
        .map(a => ({
          path: a.filePath,
          reason: 'Age threshold exceeded'
        })),
      organizationChanges: todaysAssessments.map(a => ({
        path: a.filePath,
        action: a.needsDeletion ? 'marked_for_deletion' : 'assessed'
      })),
      recommendations: todaysAssessments
        .filter(a => !a.needsDeletion && a.qualityScore === 'Poor')
        .map(a => ({
          path: a.filePath,
          suggestion: 'Improve content quality'
        }))
    };

    const id = this.currentReportId++;
    const fullReport: DailyReport = {
      ...report,
      id
    };

    this.dailyReports.set(id, fullReport);
    return fullReport;
  }

  async applyOrganizationRules(filePath: string): Promise<void> {
    try {
      const assessment = await this.assessFile(filePath);

      if (assessment.needsDeletion) {
        await this.addLog({
          level: 'warning',
          message: `File marked for deletion: ${filePath}`
        });
      }

      // Add file operation record
      await this.addFileOperation({
        sourcePath: filePath,
        operationType: 'assess',
        status: 'completed'
      });

    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to apply organization rules: ${error}`
      });
      throw error;
    }
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

/**
 * DatabaseStorage class for Midnight Magnolia integration
 * Implements file management operations using PostgreSQL/Supabase
 */
export class DatabaseStorage implements IStorage {
  // Helper methods for file quality assessment
  private calculateOverallQuality(metrics: QualityMetrics): string {
    // Implementation similar to MemStorage
    return 'Good'; // Simple implementation for now
  }

  private checkMonetizationEligibility(filePath: string, metrics: QualityMetrics): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return FILE_ORGANIZATION_RULES.monetizationCriteria.contentTypes.includes(ext);
  }

  private checkDeletionNeeded(stats: any, metrics: QualityMetrics): boolean {
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > FILE_ORGANIZATION_RULES.deletionRules.ageThreshold;
  }

  private calculateReadabilityScore(content: string): number {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;

    if (avgWordsPerSentence > 25) return 0.3; // Complex
    if (avgWordsPerSentence > 15) return 0.6; // Moderate
    return 0.9; // Easy
  }
  
  private async assessFileQuality(filePath: string): Promise<QualityMetrics> {
    const ext = path.extname(filePath).toLowerCase();
    let content = "";
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error("Error reading file:", error);
    }
    
    const stats = await fs.stat(filePath);
    let metrics: QualityMetrics = {};

    // Code quality assessment
    if (['.js', '.ts', '.py', '.jsx', '.tsx'].includes(ext)) {
      metrics.codeQuality = {
        lintingScore: 0.8,
        complexity: 0.7,
        documentation: content.includes('/**') ? 0.9 : 0.4
      };
    }

    // Document quality assessment
    if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) {
      const readability = this.calculateReadabilityScore(content);
      metrics.documentQuality = {
        readability,
        formatting: 0.8,
        completeness: 0.7
      };
    }

    // Image quality assessment
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      metrics.imageQuality = {
        resolution: 1080, // Mock values
        colorProfile: 'RGB',
        compression: 0.7
      };
    }

    return metrics;
  }

  isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return VALID_FILE_TYPES.includes(ext);
  }

  // Core CRUD operations
  async addFileOperation(operation: InsertFileOperation): Promise<FileOperation> {
    try {
      const [fileOp] = await db.insert(fileOperations).values(operation).returning();
      await this.addLog({
        level: 'info',
        message: `File operation completed: ${operation.operationType} - ${operation.sourcePath}`
      });
      return fileOp;
    } catch (error) {
      console.error("Error adding file operation:", error);
      throw error;
    }
  }

  async getFileOperations(): Promise<FileOperation[]> {
    return await db.select().from(fileOperations).orderBy(desc(fileOperations.timestamp));
  }

  async addLog(log: InsertLog): Promise<Log> {
    try {
      const [logEntry] = await db.insert(logs).values(log).returning();
      return logEntry;
    } catch (error) {
      console.error("Error adding log:", error);
      throw error;
    }
  }

  async getLogs(): Promise<Log[]> {
    return await db.select().from(logs).orderBy(desc(logs.timestamp));
  }

  async scanDirectory(dirPath: string): Promise<DirectoryEntry> {
    try {
      await this.addLog({
        level: 'info',
        message: `Scanning directory: ${dirPath}`
      });

      const execAsync = promisify(exec);
      const pythonScript = path.join(process.cwd(), 'file_scanner.py');
      const normalizedPath = path.normalize(dirPath);

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

  async assessFile(filePath: string): Promise<FileAssessment> {
    try {
      const stats = await fs.stat(filePath);
      const metrics = await this.assessFileQuality(filePath);

      const assessment: InsertFileAssessment = {
        filePath,
        fileType: path.extname(filePath).toLowerCase(),
        qualityScore: this.calculateOverallQuality(metrics),
        monetizationEligible: this.checkMonetizationEligibility(filePath, metrics),
        needsDeletion: this.checkDeletionNeeded(stats, metrics),
        metadata: metrics,
        lastModified: stats.mtime || null,
        size: stats.size.toString()
      };

      // Use fileAssessments table from shared schema
      const [fileAssessment] = await db.insert(mmFileAssessments).values({
        file_id: '', // This would need to be populated with the actual file ID
        quality_score: assessment.qualityScore,
        monetization_eligible: assessment.monetizationEligible,
        needs_deletion: assessment.needsDeletion,
        metadata: assessment.metadata
      }).returning();
      
      // Convert the DB assessment to the FileAssessment type
      return {
        id: parseInt(fileAssessment.id),
        filePath: filePath, 
        fileType: assessment.fileType,
        qualityScore: fileAssessment.quality_score,
        monetizationEligible: fileAssessment.monetization_eligible,
        needsDeletion: fileAssessment.needs_deletion,
        assessmentDate: fileAssessment.assessment_date,
        metadata: fileAssessment.metadata,
        lastModified: assessment.lastModified,
        size: assessment.size
      };
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to assess file: ${error}`
      });
      throw error;
    }
  }

  async generateDailyReport(): Promise<DailyReport> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's assessments from mm_file_assessments
      const todaysAssessments = await db.select()
        .from(mmFileAssessments)
        .where(
          // Find assessments from today
          eq(mmFileAssessments.assessment_date.getDate(), today.getDate())
        );
      
      // Get the files associated with these assessments
      const fileIds = todaysAssessments.map(a => a.file_id);
      const files = await db.select()
        .from(mmFiles)
        .where(
          // In operator to find files with IDs in the fileIds array
          mmFiles.id.in(fileIds)
        );
      
      // Create a map for quick lookup of file paths by ID
      const filePathMap = new Map();
      files.forEach(file => {
        filePathMap.set(file.id, {
          path: file.path,
          type: file.type
        });
      });

      // Build the daily report
      const report: InsertDailyReport = {
        date: today,
        filesProcessed: todaysAssessments.map(a => {
          const file = filePathMap.get(a.file_id) || { path: 'unknown', type: 'unknown' };
          return {
            path: file.path,
            type: file.type,
            quality: a.quality_score
          };
        }),
        deletions: todaysAssessments
          .filter(a => a.needs_deletion)
          .map(a => {
            const file = filePathMap.get(a.file_id) || { path: 'unknown' };
            return {
              path: file.path,
              reason: 'Age threshold exceeded'
            };
          }),
        organizationChanges: todaysAssessments.map(a => {
          const file = filePathMap.get(a.file_id) || { path: 'unknown' };
          return {
            path: file.path,
            action: a.needs_deletion ? 'marked_for_deletion' : 'assessed'
          };
        }),
        recommendations: todaysAssessments
          .filter(a => !a.needs_deletion && a.quality_score === 'Poor')
          .map(a => {
            const file = filePathMap.get(a.file_id) || { path: 'unknown' };
            return {
              path: file.path,
              suggestion: 'Improve content quality'
            };
          })
      };

      // Insert the daily report
      const [dailyReport] = await db.insert(dailyReports || []).values(report).returning();
      return dailyReport;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to generate daily report: ${error}`
      });
      throw error;
    }
  }

  async uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation> {
    try {
      if (!this.isValidFileType(file.originalname)) {
        throw new Error('Invalid file type');
      }

      // Ensure we use a safe directory path
      const baseUploadDir = path.join(process.cwd(), 'uploads');
      const uploadDir = path.join(baseUploadDir, directory);

      // Create directories
      await this.createDirectory(baseUploadDir);
      await this.createDirectory(uploadDir);

      // Create a safe filename
      const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Log successful upload
      await this.addLog({
        level: 'info',
        message: `File uploaded successfully: ${fileName}`
      });

      // Insert into mm_files table
      const fileData: InsertMMFile = {
        name: fileName,
        path: filePath,
        type: path.extname(file.originalname).toLowerCase(),
        size: file.buffer.length,
        metadata: null
      };

      const [mmFile] = await db.insert(mmFiles).values(fileData).returning();

      // Create file operation record
      const operation: InsertFileOperation = {
        sourcePath: file.originalname,
        targetPath: filePath,
        operationType: 'upload',
        status: 'completed'
      };

      return this.addFileOperation(operation);
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to upload file: ${error}`
      });
      throw error;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  async applyOrganizationRules(filePath: string): Promise<void> {
    try {
      const assessment = await this.assessFile(filePath);

      if (assessment.needsDeletion) {
        await this.addLog({
          level: 'warning',
          message: `File marked for deletion: ${filePath}`
        });
      }

      // Add file operation record
      await this.addFileOperation({
        sourcePath: filePath,
        operationType: 'assess',
        status: 'completed'
      });

    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to apply organization rules: ${error}`
      });
      throw error;
    }
  }

  // Midnight Magnolia Integration Methods
  
  // File methods
  async addMMFile(file: InsertMMFile): Promise<MMFile> {
    const [mmFile] = await db.insert(mmFiles).values(file).returning();
    return mmFile;
  }

  async getMMFiles(): Promise<MMFile[]> {
    return await db.select().from(mmFiles);
  }

  async getMMFileById(id: string): Promise<MMFile | undefined> {
    const [file] = await db.select().from(mmFiles).where(eq(mmFiles.id, id));
    return file;
  }

  // File assessment methods
  async addMMFileAssessment(assessment: InsertMMFileAssessment): Promise<MMFileAssessment> {
    const [mmAssessment] = await db.insert(mmFileAssessments).values(assessment).returning();
    return mmAssessment;
  }

  async getMMFileAssessments(): Promise<MMFileAssessment[]> {
    return await db.select().from(mmFileAssessments);
  }

  // Portfolio methods
  async addPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem> {
    const [portfolioItem] = await db.insert(portfolioItems).values(item).returning();
    return portfolioItem;
  }

  async getPortfolioItems(): Promise<PortfolioItem[]> {
    return await db.select().from(portfolioItems);
  }
  
  async getPortfolioItemById(id: string): Promise<PortfolioItem | undefined> {
    const [item] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id));
    return item;
  }
  
  async addPortfolioMedia(media: InsertPortfolioMedia): Promise<PortfolioMedia> {
    const [portfolioMedia] = await db.insert(portfolioMedia).values(media).returning();
    return portfolioMedia;
  }
  
  async addPortfolioTag(tag: InsertPortfolioTag): Promise<PortfolioTag> {
    const [portfolioTag] = await db.insert(portfolioTags).values(tag).returning();
    return portfolioTag;
  }
}

// Use MemStorage for development and DatabaseStorage for production
// export const storage = process.env.NODE_ENV === 'production' 
//   ? new DatabaseStorage() 
//   : new MemStorage();