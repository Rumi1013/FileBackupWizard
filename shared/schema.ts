import { pgTable, text, serial, timestamp, jsonb, boolean, uuid, integer, foreignKey } from "drizzle-orm/pg-core";
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

// Midnight Magnolia integration tables

// Files table for the integrated file manager
export const mmFiles = pgTable("mm_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metadata: jsonb("metadata")
});

// File assessments integration table
export const mmFileAssessments = pgTable("mm_file_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => mmFiles.id),
  qualityScore: text("quality_score").notNull(),
  monetizationEligible: boolean("monetization_eligible").notNull(),
  needsDeletion: boolean("needs_deletion").notNull(),
  assessmentDate: timestamp("assessment_date").notNull().defaultNow(),
  metadata: jsonb("metadata")
});

// File operations integration table
export const mmFileOperations = pgTable("mm_file_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => mmFiles.id),
  operationType: text("operation_type").notNull(),
  operationDate: timestamp("operation_date").notNull().defaultNow(),
  status: text("status").notNull(),
  details: jsonb("details")
});

// Portfolio integration tables
export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  visibility: text("visibility").notNull(),
  metadata: jsonb("metadata")
});

export const portfolioMedia = pgTable("portfolio_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioItemId: uuid("portfolio_item_id").notNull().references(() => portfolioItems.id),
  mediaType: text("media_type").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const portfolioTags = pgTable("portfolio_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioItemId: uuid("portfolio_item_id").notNull().references(() => portfolioItems.id),
  tag: text("tag").notNull()
});

// File recommendation system tables
export const fileRecommendations = pgTable("file_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => mmFiles.id),
  recommendationType: text("recommendation_type").notNull(),
  recommendationText: text("recommendation_text").notNull(),
  priority: text("priority").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  implemented: boolean("implemented").default(false).notNull(),
  metadata: jsonb("metadata")
});

export const recommendationCategories = pgTable("recommendation_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull()
});

export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id").notNull().references(() => fileRecommendations.id),
  helpful: boolean("helpful").notNull(),
  feedbackText: text("feedback_text"),
  createdAt: timestamp("created_at").notNull().defaultNow()
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

// Midnight Magnolia Integration Insert Schemas
export const insertMMFileSchema = createInsertSchema(mmFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMMFileAssessmentSchema = createInsertSchema(mmFileAssessments).omit({
  id: true,
  assessmentDate: true
});

export const insertMMFileOperationSchema = createInsertSchema(mmFileOperations).omit({
  id: true,
  operationDate: true
});

export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPortfolioMediaSchema = createInsertSchema(portfolioMedia).omit({
  id: true,
  createdAt: true
});

export const insertPortfolioTagSchema = createInsertSchema(portfolioTags).omit({
  id: true
});

// Recommendation system insert schemas
export const insertFileRecommendationSchema = createInsertSchema(fileRecommendations).omit({
  id: true,
  createdAt: true,
  implemented: true
});

export const insertRecommendationCategorySchema = createInsertSchema(recommendationCategories).omit({
  id: true
});

export const insertRecommendationFeedbackSchema = createInsertSchema(recommendationFeedback).omit({
  id: true,
  createdAt: true
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

// Midnight Magnolia Integration Types
export type MMFile = typeof mmFiles.$inferSelect;
export type InsertMMFile = z.infer<typeof insertMMFileSchema>;
export type MMFileAssessment = typeof mmFileAssessments.$inferSelect;
export type InsertMMFileAssessment = z.infer<typeof insertMMFileAssessmentSchema>;
export type MMFileOperation = typeof mmFileOperations.$inferSelect;
export type InsertMMFileOperation = z.infer<typeof insertMMFileOperationSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioMedia = typeof portfolioMedia.$inferSelect;
export type InsertPortfolioMedia = z.infer<typeof insertPortfolioMediaSchema>;
export type PortfolioTag = typeof portfolioTags.$inferSelect;
export type InsertPortfolioTag = z.infer<typeof insertPortfolioTagSchema>;

// Recommendation system types
export type FileRecommendationType = typeof fileRecommendations.$inferSelect;
export type InsertFileRecommendationType = z.infer<typeof insertFileRecommendationSchema>;
export type RecommendationCategoryType = typeof recommendationCategories.$inferSelect;
export type InsertRecommendationCategoryType = z.infer<typeof insertRecommendationCategorySchema>;
export type RecommendationFeedbackType = typeof recommendationFeedback.$inferSelect;
export type InsertRecommendationFeedbackType = z.infer<typeof insertRecommendationFeedbackSchema>;

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

export interface ContentSuggestion {
  category: string;
  priority: string;
  suggestion: string;
  reason: string;
}

export interface ContentAnalysis {
  id: number;
  filePath: string;
  readabilityScore: string;
  suggestions: ContentSuggestion[];
  organizationTips: string[];
  timestamp: Date;
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

export interface FileRecommendation {
  id: string;
  file_id: string;
  recommendation_type: 'quality_improvement' | 'monetization' | 'organization' | 'deletion';
  recommendation_text: string;
  priority: 'high' | 'medium' | 'low';
  created_at: Date;
  implemented: boolean;
  metadata: Record<string, any>;
}

export interface RecommendationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AIRecommendationResult {
  recommendations: FileRecommendation[];
  insights: {
    file_count: number;
    improvement_opportunities: number;
    monetization_potential: 'high' | 'medium' | 'low';
    organization_score: number;
  };
  summary: string;
}