import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fileOperations = pgTable("file_operations", {
  id: serial("id").primaryKey(),
  sourcePath: text("source_path").notNull(),
  targetPath: text("target_path"),
  operationType: text("operation_type").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const fileAssessments = pgTable("file_assessments", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  qualityScore: text("quality_score").notNull(),
  monetizationEligible: boolean("monetization_eligible").notNull(),
  needsDeletion: boolean("needs_deletion").notNull(),
  assessmentDate: timestamp("assessment_date").notNull().defaultNow(),
  metadata: jsonb("metadata").notNull(),
  lastModified: timestamp("last_modified"),
  size: text("size").notNull(),
});

export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  filesProcessed: jsonb("files_processed").notNull(),
  deletions: jsonb("deletions").notNull(),
  organizationChanges: jsonb("organization_changes").notNull(),
  recommendations: jsonb("recommendations").notNull(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

// Insert schemas
export const insertFileAssessmentSchema = createInsertSchema(fileAssessments).omit({ 
  id: true,
  assessmentDate: true 
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true
});

export const insertFileOperationSchema = createInsertSchema(fileOperations).omit({ 
  id: true,
  timestamp: true 
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true
});

// Types
export type FileOperation = typeof fileOperations.$inferSelect;
export type InsertFileOperation = z.infer<typeof insertFileOperationSchema>;
export type FileAssessment = typeof fileAssessments.$inferSelect;
export type InsertFileAssessment = z.infer<typeof insertFileAssessmentSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryEntry[];
  assessment?: FileAssessment;
}

export interface QualityMetrics {
  codeQuality?: {
    lintingScore: number;
    complexity: number;
    documentation: number;
  };
  documentQuality?: {
    readability: number;
    formatting: number;
    completeness: number;
  };
  imageQuality?: {
    resolution: number;
    colorProfile: string;
    compression: number;
  };
  videoQuality?: {
    resolution: string;
    bitrate: number;
    duration: number;
  };
}

export interface FileOrganizationRules {
  qualityThresholds: {
    code: number;
    documents: number;
    images: number;
    videos: number;
  };
  monetizationCriteria: {
    minQualityScore: number;
    requiredMetadata: string[];
    contentTypes: string[];
  };
  deletionRules: {
    ageThreshold: number;
    sizeThreshold: number;
    qualityThreshold: number;
  };
}