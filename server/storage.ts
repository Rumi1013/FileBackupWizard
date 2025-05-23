import { 
  fileOperations, logs, 
  mmFiles, mmFileAssessments, mmFileOperations, portfolioItems, portfolioMedia, portfolioTags,
  fileRecommendations, recommendationFeedback,
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
  type PortfolioTag, type InsertPortfolioTag,
  // Recommendation System Types
  type FileRecommendationType, type InsertFileRecommendationType,
  type RecommendationFeedbackType, type InsertRecommendationFeedbackType,
  // File Preview Types
  type FilePreview
} from "@shared/schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { Stats } from 'fs';
import type { Multer } from 'multer';
import { db } from './db';
import { eq, asc, desc } from 'drizzle-orm';
import crypto from 'crypto';

// File tag interfaces for the emoji tagging system
export interface FileTag {
  id: string;
  name: string; 
  emoji: string;
  color: string;
  description?: string;
  createdAt: Date;
}

export interface FileTagMapping {
  id: string;
  fileId: string;
  tagId: string;
  createdAt: Date;
}

export interface InsertFileTag {
  name: string;
  emoji: string;
  color: string;
  description?: string;
}

export interface InsertFileTagMapping {
  fileId: string;
  tagId: string;
}

export interface IStorage {
  addFileOperation(operation: InsertFileOperation): Promise<FileOperation>;
  getFileOperations(): Promise<FileOperation[]>;
  addLog(log: InsertLog): Promise<Log>;
  getLogs(): Promise<Log[]>;
  scanDirectory(dirPath: string): Promise<DirectoryEntry>;
  scanMultipleDirectories(dirPaths: string[]): Promise<{ [key: string]: DirectoryEntry }>;
  assessFile(filePath: string): Promise<FileAssessment>;
  generateDailyReport(): Promise<DailyReport>;
  uploadFile(file: { buffer: Buffer; originalname: string }, directory: string): Promise<FileOperation>;
  createDirectory(dirPath: string): Promise<void>;
  isValidFileType(filename: string): boolean;
  applyOrganizationRules(filePath: string): Promise<void>;
  
  // Recommendation system methods
  createFileRecommendation(recommendation: InsertFileRecommendationType): Promise<FileRecommendationType>;
  getFileRecommendations(fileId: string): Promise<FileRecommendationType[]>;
  getRecommendationsByType(type: string): Promise<FileRecommendationType[]>;
  markRecommendationImplemented(id: string, implemented?: boolean): Promise<FileRecommendationType>;
  addRecommendationFeedback(feedback: InsertRecommendationFeedbackType): Promise<RecommendationFeedbackType>;
  
  // File preview methods
  getFilePreview(filePath: string, previewType?: string): Promise<FilePreview>;
  getFilePreviewById(fileId: string, previewType?: string): Promise<FilePreview>;
  
  // File tag methods (emoji-based tagging system)
  createFileTag(tag: InsertFileTag): Promise<FileTag>;
  getFileTags(): Promise<FileTag[]>;
  getFileTag(id: string): Promise<FileTag | undefined>;
  updateFileTag(id: string, tag: Partial<InsertFileTag>): Promise<FileTag>;
  deleteFileTag(id: string): Promise<boolean>;
  
  // File tag mapping methods
  addTagToFile(mapping: InsertFileTagMapping): Promise<FileTagMapping>;
  removeTagFromFile(fileId: string, tagId: string): Promise<boolean>;
  getFilesWithTag(tagId: string): Promise<MMFile[]>;
  getTagsForFile(fileId: string): Promise<FileTag[]>;
  getAllFileTagMappings(): Promise<{fileId: string; tagId: string; filePath?: string; fileName?: string; tag?: FileTag}[]>;
}

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
  private fileRecommendations: Map<string, FileRecommendationType>;
  private recommendationFeedbacks: Map<string, RecommendationFeedbackType>;
  private fileTags: Map<string, FileTag>;
  private fileTagMappings: Map<string, FileTagMapping>;
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
    this.fileRecommendations = new Map();
    this.recommendationFeedbacks = new Map();
    this.fileTags = new Map();
    this.fileTagMappings = new Map();
    this.currentFileOpId = 1;
    this.currentLogId = 1;
    this.currentAnalysisId = 1;
    this.currentAssessmentId = 1;
    this.currentReportId = 1;
    
    // Initialize with some default emoji tags
    this.initializeDefaultTags();
  }
  
  private initializeDefaultTags() {
    const defaultTags: InsertFileTag[] = [
      { name: "Important", emoji: "⭐", color: "#FFD700", description: "High priority files" },
      { name: "Archived", emoji: "🗄️", color: "#A9A9A9", description: "Archived or stored for reference" },
      { name: "Draft", emoji: "📝", color: "#87CEEB", description: "Work in progress" },
      { name: "Final", emoji: "✅", color: "#32CD32", description: "Completed and approved files" },
      { name: "Review", emoji: "👁️", color: "#FF7F50", description: "Needs review or feedback" },
      { name: "Client", emoji: "👥", color: "#9370DB", description: "Client-related files" },
      { name: "Creative", emoji: "🎨", color: "#FF69B4", description: "Creative assets and designs" },
      { name: "Code", emoji: "💻", color: "#4169E1", description: "Programming files" },
      { name: "Document", emoji: "📄", color: "#20B2AA", description: "Text documents" },
      { name: "Financial", emoji: "💰", color: "#228B22", description: "Financial documents" }
    ];
    
    defaultTags.forEach(tag => {
      const id = crypto.randomUUID();
      this.fileTags.set(id, {
        id,
        ...tag,
        createdAt: new Date()
      });
    });
  }

  isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return VALID_FILE_TYPES.includes(ext);
  }

  private async assessFileQuality(filePath: string): Promise<QualityMetrics> {
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);

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
    if (['.md', '.txt', '.doc', '.docx', '.pdf', '.rtf', '.odt'].includes(ext)) {
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
    
    // Design file quality assessment
    if (['.sketch', '.xd', '.fig', '.psd', '.ai', '.indd', '.afdesign', '.afphoto'].includes(ext)) {
      metrics.designQuality = {
        resolution: 0.85,
        consistency: 0.9,
        organization: 0.8
      };
    }
    
    // E-book and publishing quality assessment
    if (['.epub', '.mobi', '.azw', '.azw3', '.ibooks'].includes(ext)) {
      metrics.ebookQuality = {
        formatting: 0.85,
        navigation: 0.9,
        metadata: 0.8
      };
    }
    
    // Midnight Magnolia specific file assessment
    if (['.mm-template', '.mm-workbook', '.mm-plan', '.mm-resource'].includes(ext) || 
        fileName.toLowerCase().includes('midnight-magnolia') || 
        fileName.toLowerCase().includes('mm-')) {
      
      // Try to determine if this is related to specific MM business lines
      const isDigitalProduct = content.includes('digital product') || 
                               content.includes('template') || 
                               content.includes('workbook') ||
                               content.includes('planner');
                               
      const isCreativeService = content.includes('service') || 
                                content.includes('brand design') || 
                                content.includes('automation') ||
                                content.includes('consultation');
                                
      const isMembership = content.includes('membership') || 
                           content.includes('subscription') || 
                           content.includes('journal') ||
                           content.includes('content');
                           
      const isProductLine = content.includes('product line') || 
                            content.includes('print-on-demand') || 
                            content.includes('pet accessories') ||
                            content.includes('stationery') ||
                            content.includes('art print');
      
      // Calculate a monetization score based on MM business lines
      const monetizationScore = [
        isDigitalProduct ? 0.9 : 0,
        isCreativeService ? 0.85 : 0,
        isMembership ? 0.8 : 0,
        isProductLine ? 0.95 : 0
      ].filter(score => score > 0).length > 0 
        ? Math.max(isDigitalProduct ? 0.9 : 0, isCreativeService ? 0.85 : 0, isMembership ? 0.8 : 0, isProductLine ? 0.95 : 0) 
        : 0.5;
      
      metrics.midnightMagnoliaQuality = {
        monetizationPotential: monetizationScore,
        businessAlignment: 0.85,
        targetAudienceMatch: this.evaluateTargetAudienceMatch(content)
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

  private evaluateTargetAudienceMatch(content: string): number {
    // Midnight Magnolia's three target audiences: digital entrepreneurs, small business owners, 
    // and "Through Our Eyes" (Black women and trauma survivors)
    
    // Digital Entrepreneurs keywords
    const digitalEntrepreneurKeywords = [
      'passive income', 'digital product', 'automation', 'entrepreneurship', 
      'online business', 'digital marketing', 'sales funnel', 'monetization',
      'digital strategy', 'side hustle', 'online income', 'business systems'
    ];
    
    // Small Business Owners keywords
    const smallBusinessKeywords = [
      'small business', 'business owner', 'branding', 'brand identity', 
      'implementation', 'business strategy', 'turnkey solution', 'startup',
      'small team', 'solo entrepreneur', 'solopreneur', 'freelancer'
    ];
    
    // Through Our Eyes audience keywords
    const throughOurEyesKeywords = [
      'black women', 'trauma', 'healing', 'expungement', 'abuse recovery',
      'southern heritage', 'black experience', 'resilience', 'trauma survivor',
      'healing journey', 'black-owned', 'women of color'
    ];
    
    // Count keyword matches for each audience
    const contentLower = content.toLowerCase();
    const digitalEntrepreneurMatches = digitalEntrepreneurKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
    
    const smallBusinessMatches = smallBusinessKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
      
    const throughOurEyesMatches = throughOurEyesKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
    
    // Calculate match percentages
    const totalDigitalKeywords = digitalEntrepreneurKeywords.length;
    const totalSmallBusinessKeywords = smallBusinessKeywords.length;
    const totalThroughOurEyesKeywords = throughOurEyesKeywords.length;
    
    const digitalMatchPercentage = digitalEntrepreneurMatches / totalDigitalKeywords;
    const smallBusinessMatchPercentage = smallBusinessMatches / totalSmallBusinessKeywords;
    const throughOurEyesMatchPercentage = throughOurEyesMatches / totalThroughOurEyesKeywords;
    
    // Return the highest match percentage as the overall audience match score
    return Math.max(digitalMatchPercentage, smallBusinessMatchPercentage, throughOurEyesMatchPercentage);
  }
  
  private calculateOverallQuality(metrics: QualityMetrics): string {
    // Enhanced quality calculation logic with Midnight Magnolia specifics
    if (metrics.midnightMagnoliaQuality) {
      // For MM-specific files, prioritize monetization potential and business alignment
      const mmScore = (
        metrics.midnightMagnoliaQuality.monetizationPotential * 0.5 +
        metrics.midnightMagnoliaQuality.businessAlignment * 0.3 +
        metrics.midnightMagnoliaQuality.targetAudienceMatch * 0.2
      );
      
      if (mmScore > 0.75) return 'Good';
      if (mmScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Document quality assessment
    if (metrics.documentQuality) {
      const docScore = (
        metrics.documentQuality.readability * 0.4 +
        metrics.documentQuality.formatting * 0.3 +
        metrics.documentQuality.completeness * 0.3
      );
      
      if (docScore > 0.7) return 'Good';
      if (docScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Code quality assessment
    if (metrics.codeQuality) {
      const codeScore = (
        metrics.codeQuality.lintingScore * 0.3 +
        metrics.codeQuality.complexity * 0.3 +
        metrics.codeQuality.documentation * 0.4
      );
      
      if (codeScore > 0.7) return 'Good';
      if (codeScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Design quality assessment
    if (metrics.designQuality) {
      const designScore = (
        metrics.designQuality.resolution * 0.3 +
        metrics.designQuality.consistency * 0.4 +
        metrics.designQuality.organization * 0.3
      );
      
      if (designScore > 0.7) return 'Good';
      if (designScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // E-book quality assessment
    if (metrics.ebookQuality) {
      const ebookScore = (
        metrics.ebookQuality.formatting * 0.4 +
        metrics.ebookQuality.navigation * 0.3 +
        metrics.ebookQuality.metadata * 0.3
      );
      
      if (ebookScore > 0.7) return 'Good';
      if (ebookScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Default fallback
    return 'Moderate';
  }

  private checkMonetizationEligibility(filePath: string, metrics: QualityMetrics): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // If it has Midnight Magnolia quality metrics, check those first
    if (metrics.midnightMagnoliaQuality) {
      // File is eligible if it has high monetization potential and good audience match
      if (metrics.midnightMagnoliaQuality.monetizationPotential > 0.75 &&
          metrics.midnightMagnoliaQuality.targetAudienceMatch > 0.6) {
        return true;
      }
    }
    
    // Special case for MM-specific file extensions
    if (['.mm-template', '.mm-workbook', '.mm-plan', '.mm-resource'].includes(ext) ||
        fileName.toLowerCase().includes('midnight-magnolia') ||
        fileName.toLowerCase().includes('mm-')) {
      return true;
    }

    // Design files with high quality metrics
    if (metrics.designQuality && 
        (metrics.designQuality.resolution > 0.8 || metrics.designQuality.consistency > 0.8)) {
      return true;
    }
    
    // Ebooks that are well-formatted and have good metadata
    if (metrics.ebookQuality && 
        metrics.ebookQuality.formatting > 0.7 && 
        metrics.ebookQuality.metadata > 0.8) {
      return true;
    }
    
    // Check document quality for certain file types
    if (metrics.documentQuality && 
        ['.pdf', '.docx', '.doc', '.odt'].includes(ext) && 
        metrics.documentQuality.readability > 0.7 &&
        metrics.documentQuality.completeness > 0.8) {
      return true;
    }
    
    // Fallback to original file organization rules
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
  
  async scanMultipleDirectories(dirPaths: string[]): Promise<{ [key: string]: DirectoryEntry }> {
    try {
      if (!dirPaths || !Array.isArray(dirPaths) || dirPaths.length === 0) {
        throw new Error('No directory paths provided or invalid format');
      }
      
      await this.addLog({
        level: 'info',
        message: `Starting batch scan of ${dirPaths.length} directories`
      });

      // Process each directory in parallel
      const scanPromises = dirPaths.map(async (dirPath) => {
        try {
          const result = await this.scanDirectory(dirPath);
          return { dirPath, result, success: true };
        } catch (error) {
          // Log individual errors but don't fail the entire operation
          await this.addLog({
            level: 'error',
            message: `Error scanning directory ${dirPath}: ${error}`
          });
          
          return { 
            dirPath, 
            result: {
              name: path.basename(dirPath),
              path: dirPath,
              type: 'directory',
              children: [],
              error: String(error)
            }, 
            success: false 
          };
        }
      });
      
      const results = await Promise.all(scanPromises);
      
      // Convert array of results to an object with dirPath as key
      const resultMap: { [key: string]: DirectoryEntry } = {};
      results.forEach(({ dirPath, result }) => {
        resultMap[dirPath] = result;
      });
      
      // Log completion
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      await this.addLog({
        level: 'info',
        message: `Batch scan completed: ${successCount} successful, ${failCount} failed`
      });
      
      return resultMap;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to scan multiple directories: ${error}`
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
  
  // Recommendation system methods
  async createFileRecommendation(recommendation: InsertFileRecommendationType): Promise<FileRecommendationType> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const fullRecommendation: FileRecommendationType = {
      ...recommendation,
      id,
      createdAt: now,
      implemented: false
    };
    
    this.fileRecommendations.set(id, fullRecommendation);
    await this.addLog({
      level: 'info',
      message: `Created file recommendation for file ID: ${recommendation.fileId}`
    });
    
    return fullRecommendation;
  }
  
  async getFileRecommendations(fileId: string): Promise<FileRecommendationType[]> {
    return Array.from(this.fileRecommendations.values())
      .filter(rec => rec.fileId === fileId);
  }
  
  async getRecommendationsByType(type: string): Promise<FileRecommendationType[]> {
    return Array.from(this.fileRecommendations.values())
      .filter(rec => rec.recommendationType === type);
  }
  
  async markRecommendationImplemented(id: string, implemented: boolean = true): Promise<FileRecommendationType> {
    const recommendation = this.fileRecommendations.get(id);
    
    if (!recommendation) {
      throw new Error(`Recommendation with ID ${id} not found`);
    }
    
    const updatedRecommendation = {
      ...recommendation,
      implemented
    };
    
    this.fileRecommendations.set(id, updatedRecommendation);
    await this.addLog({
      level: 'info',
      message: `Marked recommendation ${id} as ${implemented ? 'implemented' : 'not implemented'}`
    });
    
    return updatedRecommendation;
  }
  
  async addRecommendationFeedback(feedback: InsertRecommendationFeedbackType): Promise<RecommendationFeedbackType> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const fullFeedback: RecommendationFeedbackType = {
      ...feedback,
      id,
      createdAt: now
    };
    
    this.recommendationFeedbacks.set(id, fullFeedback);
    await this.addLog({
      level: 'info',
      message: `Added feedback for recommendation ID: ${feedback.recommendationId}`
    });
    
    return fullFeedback;
  }
  
  // File preview methods
  async getFilePreview(filePath: string, previewType: string = 'text'): Promise<FilePreview> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const fileType = path.extname(filePath).toLowerCase();
      
      let content = '';
      let truncated = false;
      const maxPreviewSize = 100 * 1024; // 100KB max preview size
      
      // Handle different preview types based on file extension
      if (previewType === 'text' && ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py'].includes(fileType)) {
        if (stats.size > maxPreviewSize) {
          // If file is too large, read only the first maxPreviewSize bytes
          const buffer = Buffer.alloc(maxPreviewSize);
          const fileHandle = await fs.open(filePath, 'r');
          await fileHandle.read(buffer, 0, maxPreviewSize, 0);
          await fileHandle.close();
          content = buffer.toString('utf-8');
          truncated = true;
        } else {
          content = await fs.readFile(filePath, 'utf-8');
        }
      } else if (previewType === 'image' && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(fileType)) {
        // For image files, we would typically return a base64 representation
        // This is a simplified version that just indicates an image
        content = 'IMAGE_CONTENT_BASE64';
      } else if (previewType === 'binary' && ['.doc', '.docx', '.pdf', '.xls', '.xlsx'].includes(fileType)) {
        // For document files, we might return metadata or a simplified representation
        content = 'BINARY_DOCUMENT_CONTENT';
      } else {
        // Generic handling for unsupported file types
        content = `File type ${fileType} preview not supported`;
      }
      
      // Create a unique ID for the preview
      const id = crypto.randomUUID();
      
      const preview: FilePreview = {
        id,
        filePath,
        fileName,
        fileType,
        previewType,
        content,
        truncated,
        size: stats.size,
        lastModified: stats.mtime,
        metadata: {
          accessTime: stats.atime,
          changeTime: stats.ctime,
          permissions: stats.mode,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile()
        }
      };
      
      await this.addLog({
        level: 'info',
        message: `Generated ${previewType} preview for file: ${filePath}`
      });
      
      return preview;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to generate preview for file: ${error}`
      });
      throw new Error(`Failed to generate preview: ${error}`);
    }
  }
  
  async getFilePreviewById(fileId: string, previewType: string = 'text'): Promise<FilePreview> {
    // In the in-memory storage implementation, we'll maintain a simple mapping of file IDs to file paths
    // For our test implementation, we'll look for any file operation with a matching target path
    
    const fileOperations = Array.from(this.fileOps.values());
    const fileOp = fileOperations.find(op => op.id.toString() === fileId);
    
    if (!fileOp || !fileOp.targetPath) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    // Use the file path to generate a preview
    return this.getFilePreview(fileOp.targetPath, previewType);
  }
  
  // File tag methods (emoji-based tagging system)
  async createFileTag(tag: InsertFileTag): Promise<FileTag> {
    const id = crypto.randomUUID();
    const newTag: FileTag = {
      id,
      ...tag,
      createdAt: new Date()
    };
    
    this.fileTags.set(id, newTag);
    return newTag;
  }
  
  async getFileTags(): Promise<FileTag[]> {
    return Array.from(this.fileTags.values());
  }
  
  async getFileTag(id: string): Promise<FileTag | undefined> {
    return this.fileTags.get(id);
  }
  
  async updateFileTag(id: string, tag: Partial<InsertFileTag>): Promise<FileTag> {
    const existingTag = this.fileTags.get(id);
    if (!existingTag) {
      throw new Error(`Tag with ID ${id} not found`);
    }
    
    const updatedTag = {
      ...existingTag,
      ...tag
    };
    
    this.fileTags.set(id, updatedTag);
    return updatedTag;
  }
  
  async deleteFileTag(id: string): Promise<boolean> {
    if (!this.fileTags.has(id)) {
      return false;
    }
    
    // Remove the tag
    this.fileTags.delete(id);
    
    // Remove all mappings with this tag
    for (const [mappingId, mapping] of this.fileTagMappings.entries()) {
      if (mapping.tagId === id) {
        this.fileTagMappings.delete(mappingId);
      }
    }
    
    return true;
  }
  
  // File tag mapping methods
  async addTagToFile(mapping: InsertFileTagMapping): Promise<FileTagMapping> {
    // Validate file and tag exist
    const fileOperations = Array.from(this.fileOps.values());
    const fileExists = fileOperations.some(op => op.id.toString() === mapping.fileId);
    
    if (!fileExists) {
      throw new Error(`File with ID ${mapping.fileId} not found`);
    }
    
    const tag = await this.getFileTag(mapping.tagId);
    if (!tag) {
      throw new Error(`Tag with ID ${mapping.tagId} not found`);
    }
    
    // Check if mapping already exists to avoid duplicates
    const existingMapping = Array.from(this.fileTagMappings.values()).find(
      m => m.fileId === mapping.fileId && m.tagId === mapping.tagId
    );
    
    if (existingMapping) {
      return existingMapping;
    }
    
    // Create new mapping
    const id = crypto.randomUUID();
    const tagMapping: FileTagMapping = {
      id,
      ...mapping,
      createdAt: new Date()
    };
    
    this.fileTagMappings.set(id, tagMapping);
    return tagMapping;
  }
  
  async removeTagFromFile(fileId: string, tagId: string): Promise<boolean> {
    let found = false;
    
    for (const [mappingId, mapping] of this.fileTagMappings.entries()) {
      if (mapping.fileId === fileId && mapping.tagId === tagId) {
        this.fileTagMappings.delete(mappingId);
        found = true;
      }
    }
    
    return found;
  }
  
  async getFilesWithTag(tagId: string): Promise<MMFile[]> {
    // Find all mappings with this tag
    const mappingsWithTag = Array.from(this.fileTagMappings.values())
      .filter(mapping => mapping.tagId === tagId);
    
    // Get all unique file IDs
    const fileIds = [...new Set(mappingsWithTag.map(mapping => mapping.fileId))];
    
    // Get the files
    const files: MMFile[] = [];
    for (const fileId of fileIds) {
      // In memory implementation - we don't have actual MMFile objects
      // This is a stub that would be populated properly in the DB implementation
      const fileOp = Array.from(this.fileOps.values()).find(op => op.id.toString() === fileId);
      if (fileOp) {
        const mmFile: MMFile = {
          id: fileId,
          name: path.basename(fileOp.targetPath || "unknown"),
          path: fileOp.targetPath || "",
          type: path.extname(fileOp.targetPath || "").toLowerCase(),
          size: 0, // Would be actual file size in DB implementation
          createdAt: fileOp.timestamp,
          updatedAt: fileOp.timestamp,
          metadata: {}
        };
        files.push(mmFile);
      }
    }
    
    return files;
  }
  
  async getTagsForFile(fileId: string): Promise<FileTag[]> {
    // Find all mappings for this file
    const mappingsForFile = Array.from(this.fileTagMappings.values())
      .filter(mapping => mapping.fileId === fileId);
    
    // Get all unique tag IDs
    const tagIds = [...new Set(mappingsForFile.map(mapping => mapping.tagId))];
    
    // Get the tags
    const tags: FileTag[] = [];
    for (const tagId of tagIds) {
      const tag = await this.getFileTag(tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  async getAllFileTagMappings(): Promise<{fileId: string; tagId: string; filePath?: string; fileName?: string; tag?: FileTag}[]> {
    // Get all mappings with enhanced information
    const mappings = Array.from(this.fileTagMappings.values());
    
    // Enhance mappings with file paths and tag information
    const enhancedMappings = await Promise.all(mappings.map(async (mapping) => {
      // Find tag information
      const tag = await this.getFileTag(mapping.tagId);
      
      // Find file path from file assessments
      let filePath: string | undefined = undefined;
      
      // Assuming fileId could be a filePath in some cases
      if (mapping.fileId.includes('/')) {
        filePath = mapping.fileId;
      } else {
        // Try to find the file path from file assessments
        const assessment = Array.from(this.fileAssessments.values())
          .find(assessment => assessment.id.toString() === mapping.fileId);
          
        if (assessment) {
          filePath = assessment.filePath;
        }
      }
      
      // Get file name from path if available
      const fileName = filePath ? path.basename(filePath) : undefined;
      
      return {
        fileId: mapping.fileId,
        tagId: mapping.tagId,
        filePath,
        fileName,
        tag
      };
    }));
    
    return enhancedMappings;
  }
}

export const storage = new MemStorage();

/**
 * DatabaseStorage class for Midnight Magnolia integration
 * Implements file management operations using PostgreSQL/Supabase
 */
export class DatabaseStorage implements IStorage {
  // Helper methods for file quality assessment
  private evaluateTargetAudienceMatch(content: string): number {
    // Midnight Magnolia's three target audiences: digital entrepreneurs, small business owners, 
    // and "Through Our Eyes" (Black women and trauma survivors)
    
    // Digital Entrepreneurs keywords
    const digitalEntrepreneurKeywords = [
      'passive income', 'digital product', 'automation', 'entrepreneurship', 
      'online business', 'digital marketing', 'sales funnel', 'monetization',
      'digital strategy', 'side hustle', 'online income', 'business systems'
    ];
    
    // Small Business Owners keywords
    const smallBusinessKeywords = [
      'small business', 'business owner', 'branding', 'brand identity', 
      'implementation', 'business strategy', 'turnkey solution', 'startup',
      'small team', 'solo entrepreneur', 'solopreneur', 'freelancer'
    ];
    
    // Through Our Eyes audience keywords
    const throughOurEyesKeywords = [
      'black women', 'trauma', 'healing', 'expungement', 'abuse recovery',
      'southern heritage', 'black experience', 'resilience', 'trauma survivor',
      'healing journey', 'black-owned', 'women of color'
    ];
    
    // Count keyword matches for each audience
    const contentLower = content.toLowerCase();
    const digitalEntrepreneurMatches = digitalEntrepreneurKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
    
    const smallBusinessMatches = smallBusinessKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
      
    const throughOurEyesMatches = throughOurEyesKeywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())).length;
    
    // Calculate match percentages
    const totalDigitalKeywords = digitalEntrepreneurKeywords.length;
    const totalSmallBusinessKeywords = smallBusinessKeywords.length;
    const totalThroughOurEyesKeywords = throughOurEyesKeywords.length;
    
    const digitalMatchPercentage = digitalEntrepreneurMatches / totalDigitalKeywords;
    const smallBusinessMatchPercentage = smallBusinessMatches / totalSmallBusinessKeywords;
    const throughOurEyesMatchPercentage = throughOurEyesMatches / totalThroughOurEyesKeywords;
    
    // Return the highest match percentage as the overall audience match score
    return Math.max(digitalMatchPercentage, smallBusinessMatchPercentage, throughOurEyesMatchPercentage);
  }
  
  private calculateOverallQuality(metrics: QualityMetrics): string {
    // Enhanced quality calculation logic with Midnight Magnolia specifics
    if (metrics.midnightMagnoliaQuality) {
      // For MM-specific files, prioritize monetization potential and business alignment
      const mmScore = (
        metrics.midnightMagnoliaQuality.monetizationPotential * 0.5 +
        metrics.midnightMagnoliaQuality.businessAlignment * 0.3 +
        metrics.midnightMagnoliaQuality.targetAudienceMatch * 0.2
      );
      
      if (mmScore > 0.75) return 'Good';
      if (mmScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Document quality assessment
    if (metrics.documentQuality) {
      const docScore = (
        metrics.documentQuality.readability * 0.4 +
        metrics.documentQuality.formatting * 0.3 +
        metrics.documentQuality.completeness * 0.3
      );
      
      if (docScore > 0.7) return 'Good';
      if (docScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Code quality assessment
    if (metrics.codeQuality) {
      const codeScore = (
        metrics.codeQuality.lintingScore * 0.3 +
        metrics.codeQuality.complexity * 0.3 +
        metrics.codeQuality.documentation * 0.4
      );
      
      if (codeScore > 0.7) return 'Good';
      if (codeScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Design quality assessment
    if (metrics.designQuality) {
      const designScore = (
        metrics.designQuality.resolution * 0.3 +
        metrics.designQuality.consistency * 0.4 +
        metrics.designQuality.organization * 0.3
      );
      
      if (designScore > 0.7) return 'Good';
      if (designScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // E-book quality assessment
    if (metrics.ebookQuality) {
      const ebookScore = (
        metrics.ebookQuality.formatting * 0.4 +
        metrics.ebookQuality.navigation * 0.3 +
        metrics.ebookQuality.metadata * 0.3
      );
      
      if (ebookScore > 0.7) return 'Good';
      if (ebookScore > 0.5) return 'Moderate';
      return 'Poor';
    }
    
    // Default fallback
    return 'Moderate';
  }

  private checkMonetizationEligibility(filePath: string, metrics: QualityMetrics): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // If it has Midnight Magnolia quality metrics, check those first
    if (metrics.midnightMagnoliaQuality) {
      // File is eligible if it has high monetization potential and good audience match
      if (metrics.midnightMagnoliaQuality.monetizationPotential > 0.75 &&
          metrics.midnightMagnoliaQuality.targetAudienceMatch > 0.6) {
        return true;
      }
    }
    
    // Special case for MM-specific file extensions
    if (['.mm-template', '.mm-workbook', '.mm-plan', '.mm-resource'].includes(ext) ||
        fileName.toLowerCase().includes('midnight-magnolia') ||
        fileName.toLowerCase().includes('mm-')) {
      return true;
    }

    // Design files with high quality metrics
    if (metrics.designQuality && 
        (metrics.designQuality.resolution > 0.8 || metrics.designQuality.consistency > 0.8)) {
      return true;
    }
    
    // Ebooks that are well-formatted and have good metadata
    if (metrics.ebookQuality && 
        metrics.ebookQuality.formatting > 0.7 && 
        metrics.ebookQuality.metadata > 0.8) {
      return true;
    }
    
    // Check document quality for certain file types
    if (metrics.documentQuality && 
        ['.pdf', '.docx', '.doc', '.odt'].includes(ext) && 
        metrics.documentQuality.readability > 0.7 &&
        metrics.documentQuality.completeness > 0.8) {
      return true;
    }
    
    // Fallback to original file organization rules
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
    const fileName = path.basename(filePath);
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
    if (['.md', '.txt', '.doc', '.docx', '.pdf', '.rtf', '.odt'].includes(ext)) {
      const readability = this.calculateReadabilityScore(content);
      metrics.documentQuality = {
        readability,
        formatting: 0.8,
        completeness: 0.7
      };
    }

    // Image quality assessment
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif'].includes(ext)) {
      metrics.imageQuality = {
        resolution: 0.85, // Normalized values (0-1)
        colorProfile: 'RGB',
        compression: 0.7
      };
    }
    
    // Design file quality assessment
    if (['.sketch', '.xd', '.fig', '.psd', '.ai', '.indd', '.afdesign', '.afphoto'].includes(ext)) {
      metrics.designQuality = {
        resolution: 0.85,
        consistency: 0.9,
        organization: 0.8
      };
    }
    
    // E-book and publishing quality assessment
    if (['.epub', '.mobi', '.azw', '.azw3', '.ibooks'].includes(ext)) {
      metrics.ebookQuality = {
        formatting: 0.85,
        navigation: 0.9,
        metadata: 0.8
      };
    }
    
    // Midnight Magnolia specific file assessment
    if (['.mm-template', '.mm-workbook', '.mm-plan', '.mm-resource'].includes(ext) || 
        fileName.toLowerCase().includes('midnight-magnolia') || 
        fileName.toLowerCase().includes('mm-')) {
      
      // Try to determine if this is related to specific MM business lines
      const isDigitalProduct = content.includes('digital product') || 
                               content.includes('template') || 
                               content.includes('workbook') ||
                               content.includes('planner');
                               
      const isCreativeService = content.includes('service') || 
                                content.includes('brand design') || 
                                content.includes('automation') ||
                                content.includes('consultation');
                                
      const isMembership = content.includes('membership') || 
                           content.includes('subscription') || 
                           content.includes('journal') ||
                           content.includes('content');
                           
      const isProductLine = content.includes('product line') || 
                            content.includes('print-on-demand') || 
                            content.includes('pet accessories') ||
                            content.includes('stationery') ||
                            content.includes('art print');
      
      // Calculate a monetization score based on MM business lines
      const monetizationScore = [
        isDigitalProduct ? 0.9 : 0,
        isCreativeService ? 0.85 : 0,
        isMembership ? 0.8 : 0,
        isProductLine ? 0.95 : 0
      ].filter(score => score > 0).length > 0 
        ? Math.max(isDigitalProduct ? 0.9 : 0, isCreativeService ? 0.85 : 0, isMembership ? 0.8 : 0, isProductLine ? 0.95 : 0) 
        : 0.5;
      
      metrics.midnightMagnoliaQuality = {
        monetizationPotential: monetizationScore,
        businessAlignment: 0.85,
        targetAudienceMatch: this.evaluateTargetAudienceMatch(content)
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
      // Validate and sanitize the input path
      const normalizedPath = path.normalize(dirPath);
      
      // Skip system directories entirely to prevent errors
      if (normalizedPath.includes('/proc') || 
          normalizedPath.includes('/sys') || 
          normalizedPath.includes('/dev') || 
          normalizedPath.includes('/run')) {
        
        await this.addLog({
          level: 'warn',
          message: `Skipping system directory: ${normalizedPath}`
        });
        
        // Return a minimal directory structure for system directories
        return {
          name: path.basename(normalizedPath),
          path: normalizedPath,
          type: 'directory',
          children: []
        };
      }
      
      await this.addLog({
        level: 'info',
        message: `Scanning directory: ${normalizedPath}`
      });

      const execAsync = promisify(exec);
      const pythonScript = path.join(process.cwd(), 'file_scanner.py');
      
      // Set timeout for the command to prevent hanging
      const options = { timeout: 30000, maxBuffer: 1024 * 1024 * 10 }; // 10MB buffer
      
      try {
        const { stdout, stderr } = await execAsync(`python ${pythonScript} --dir "${normalizedPath}"`, options);

        if (stderr) {
          await this.addLog({
            level: 'warn',
            message: `Scanner warnings: ${stderr}`
          });
        }

        let result;
        try {
          result = JSON.parse(stdout);
        } catch (e) {
          await this.addLog({
            level: 'error',
            message: `Failed to parse scanner output: ${e}`
          });
          throw new Error('Invalid scanner output');
        }

        if ('error' in result) {
          await this.addLog({
            level: 'error',
            message: `Scan failed: ${result.error}`
          });
          
          // Return a basic structure with the error instead of throwing
          return {
            name: path.basename(normalizedPath),
            path: normalizedPath,
            type: 'directory',
            children: [],
            error: result.error
          };
        }

        return result;
        
      } catch (execError) {
        // Handle command execution errors
        await this.addLog({
          level: 'error',
          message: `Scanner execution error: ${execError}`
        });
        
        // Return a basic structure with the error instead of throwing
        return {
          name: path.basename(normalizedPath),
          path: normalizedPath,
          type: 'directory',
          children: [],
          error: `Scanner execution failed: ${execError}`
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      await this.addLog({
        level: 'error',
        message: `Failed to scan directory: ${errorMsg}`
      });
      
      // Return a basic structure with the error instead of throwing
      return {
        name: path.basename(dirPath),
        path: dirPath,
        type: 'directory',
        children: [],
        error: `Scan failed: ${errorMsg}`
      };
    }
  }
  
  async scanMultipleDirectories(dirPaths: string[]): Promise<{ [key: string]: DirectoryEntry }> {
    try {
      if (!dirPaths || !Array.isArray(dirPaths) || dirPaths.length === 0) {
        throw new Error('No directory paths provided or invalid format');
      }
      
      await this.addLog({
        level: 'info',
        message: `Starting batch scan of ${dirPaths.length} directories in database storage`
      });

      // Process each directory in parallel
      const scanPromises = dirPaths.map(async (dirPath) => {
        try {
          const result = await this.scanDirectory(dirPath);
          return { dirPath, result, success: true };
        } catch (error) {
          // Log individual errors but don't fail the entire operation
          await this.addLog({
            level: 'error',
            message: `Error scanning directory ${dirPath}: ${error}`
          });
          
          return { 
            dirPath, 
            result: {
              name: path.basename(dirPath),
              path: dirPath,
              type: 'directory',
              children: [],
              error: String(error)
            }, 
            success: false 
          };
        }
      });
      
      const results = await Promise.all(scanPromises);
      
      // Convert array of results to an object with dirPath as key
      const resultMap: { [key: string]: DirectoryEntry } = {};
      results.forEach(({ dirPath, result }) => {
        resultMap[dirPath] = result;
      });
      
      // Log completion
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      await this.addLog({
        level: 'info',
        message: `Database batch scan completed: ${successCount} successful, ${failCount} failed`
      });
      
      return resultMap;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to scan multiple directories: ${error}`
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
  
  // Recommendation system methods
  async createFileRecommendation(recommendation: InsertFileRecommendationType): Promise<FileRecommendationType> {
    try {
      const [inserted] = await db
        .insert(fileRecommendations)
        .values({
          fileId: recommendation.fileId,
          recommendationType: recommendation.recommendationType,
          recommendationText: recommendation.recommendationText,
          priority: recommendation.priority,
          metadata: recommendation.metadata || {}
        })
        .returning();
      
      await this.addLog({
        level: 'info',
        message: `Created file recommendation for file ID: ${recommendation.fileId}`
      });
      
      return inserted;
    } catch (error) {
      console.error("Error creating file recommendation:", error);
      throw new Error(`Failed to create file recommendation: ${error}`);
    }
  }
  
  async getFileRecommendations(fileId: string): Promise<FileRecommendationType[]> {
    try {
      return await db
        .select()
        .from(fileRecommendations)
        .where(eq(fileRecommendations.fileId, fileId));
    } catch (error) {
      console.error("Error getting file recommendations:", error);
      throw new Error(`Failed to get file recommendations: ${error}`);
    }
  }
  
  async getRecommendationsByType(type: string): Promise<FileRecommendationType[]> {
    try {
      return await db
        .select()
        .from(fileRecommendations)
        .where(eq(fileRecommendations.recommendationType, type));
    } catch (error) {
      console.error("Error getting recommendations by type:", error);
      throw new Error(`Failed to get recommendations by type: ${error}`);
    }
  }
  
  async markRecommendationImplemented(id: string, implemented: boolean = true): Promise<FileRecommendationType> {
    try {
      const [updated] = await db
        .update(fileRecommendations)
        .set({ implemented })
        .where(eq(fileRecommendations.id, id))
        .returning();
      
      if (!updated) {
        throw new Error(`Recommendation with ID ${id} not found`);
      }
      
      await this.addLog({
        level: 'info',
        message: `Marked recommendation ${id} as ${implemented ? 'implemented' : 'not implemented'}`
      });
      
      return updated;
    } catch (error) {
      console.error("Error marking recommendation implemented:", error);
      throw new Error(`Failed to mark recommendation as implemented: ${error}`);
    }
  }
  
  async addRecommendationFeedback(feedback: InsertRecommendationFeedbackType): Promise<RecommendationFeedbackType> {
    try {
      const [inserted] = await db
        .insert(recommendationFeedback)
        .values({
          recommendationId: feedback.recommendationId,
          helpful: feedback.helpful,
          feedbackText: feedback.feedbackText || null
        })
        .returning();
      
      await this.addLog({
        level: 'info',
        message: `Added feedback for recommendation ID: ${feedback.recommendationId}`
      });
      
      return inserted;
    } catch (error) {
      console.error("Error adding recommendation feedback:", error);
      throw new Error(`Failed to add recommendation feedback: ${error}`);
    }
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
  
  // File preview methods
  async getFilePreview(filePath: string, previewType: string = 'text'): Promise<FilePreview> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const fileType = path.extname(filePath).toLowerCase();
      
      let content = '';
      let truncated = false;
      const maxPreviewSize = 100 * 1024; // 100KB max preview size
      
      // Handle different preview types based on file extension
      if (previewType === 'text' && ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py'].includes(fileType)) {
        if (stats.size > maxPreviewSize) {
          // If file is too large, read only the first maxPreviewSize bytes
          const buffer = Buffer.alloc(maxPreviewSize);
          const fileHandle = await fs.open(filePath, 'r');
          await fileHandle.read(buffer, 0, maxPreviewSize, 0);
          await fileHandle.close();
          content = buffer.toString('utf-8');
          truncated = true;
        } else {
          content = await fs.readFile(filePath, 'utf-8');
        }
      } else if (previewType === 'image' && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(fileType)) {
        // For image files in a database implementation, we would typically return a base64 representation
        // or a URL to access the image via a separate endpoint
        content = 'IMAGE_CONTENT_BASE64';
      } else if (previewType === 'binary' && ['.doc', '.docx', '.pdf', '.xls', '.xlsx'].includes(fileType)) {
        // For binary files, return metadata only
        content = 'BINARY_DOCUMENT_METADATA';
      } else {
        // Generic handling for unsupported file types
        content = `File type ${fileType} preview not supported`;
      }
      
      // Create a unique ID for the preview
      const id = crypto.randomUUID();
      
      // Check if this file is in our database
      const mmFile = await this.getMMFileByPath(filePath);
      
      const preview: FilePreview = {
        id,
        filePath,
        fileName,
        fileType,
        previewType,
        content,
        truncated,
        size: stats.size,
        lastModified: stats.mtime,
        metadata: {
          fileId: mmFile?.id || null,
          accessTime: stats.atime,
          changeTime: stats.ctime,
          permissions: stats.mode,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile()
        }
      };
      
      await this.addLog({
        level: 'info',
        message: `Generated ${previewType} preview for file: ${filePath}`
      });
      
      return preview;
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to generate preview for file: ${error}`
      });
      throw new Error(`Failed to generate preview: ${error}`);
    }
  }
  
  async getFilePreviewById(fileId: string, previewType: string = 'text'): Promise<FilePreview> {
    try {
      // Get the file from the database
      const file = await this.getMMFileById(fileId);
      
      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Use the file path to generate a preview
      return this.getFilePreview(file.path, previewType);
    } catch (error) {
      await this.addLog({
        level: 'error',
        message: `Failed to generate preview for file ID ${fileId}: ${error}`
      });
      throw error;
    }
  }
  
  // Helper method to find a file by path
  private async getMMFileByPath(filePath: string): Promise<MMFile | undefined> {
    const [file] = await db.select().from(mmFiles).where(eq(mmFiles.path, filePath));
    return file;
  }
  
  // File tag methods (emoji-based tagging system)
  async createFileTag(tag: InsertFileTag): Promise<FileTag> {
    // Create a new tag with a random UUID
    const id = crypto.randomUUID();
    const now = new Date();
    
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB insert
    return {
      id,
      ...tag,
      createdAt: now
    };
  }
  
  async getFileTags(): Promise<FileTag[]> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB query to get all tags
    return [];
  }
  
  async getFileTag(id: string): Promise<FileTag | undefined> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB query to get a tag by ID
    return undefined;
  }
  
  async updateFileTag(id: string, tag: Partial<InsertFileTag>): Promise<FileTag> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB update
    throw new Error("Method not implemented in database storage yet");
  }
  
  async deleteFileTag(id: string): Promise<boolean> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB delete
    return false;
  }
  
  // File tag mapping methods
  async addTagToFile(mapping: InsertFileTagMapping): Promise<FileTagMapping> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB insert
    const id = crypto.randomUUID();
    return {
      id,
      ...mapping,
      createdAt: new Date()
    };
  }
  
  async removeTagFromFile(fileId: string, tagId: string): Promise<boolean> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB delete
    return false;
  }
  
  async getFilesWithTag(tagId: string): Promise<MMFile[]> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB query
    return [];
  }
  
  async getTagsForFile(fileId: string): Promise<FileTag[]> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB query
    return [];
  }
  
  async getAllFileTagMappings(): Promise<{fileId: string; tagId: string; filePath?: string; fileName?: string; tag?: FileTag}[]> {
    // TODO: Implement DB-based storage when migrating to PostgreSQL
    // This would be replaced with a proper DB query to join file tag mappings with files and tags
    return [];
  }
}

// Use MemStorage for development and DatabaseStorage for production
// export const storage = process.env.NODE_ENV === 'production' 
//   ? new DatabaseStorage() 
//   : new MemStorage();