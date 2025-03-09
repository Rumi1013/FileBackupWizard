import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

export const contentAnalysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull(),
  readabilityScore: text("readability_score").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  organizationTips: jsonb("organization_tips").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

export const insertFileOperationSchema = createInsertSchema(fileOperations).omit({ 
  id: true,
  timestamp: true 
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true
});

export const insertContentAnalysisSchema = createInsertSchema(contentAnalysis).omit({
  id: true,
  timestamp: true
});

export type FileOperation = typeof fileOperations.$inferSelect;
export type InsertFileOperation = z.infer<typeof insertFileOperationSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type InsertContentAnalysis = z.infer<typeof insertContentAnalysisSchema>;

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryEntry[];
}

export interface ContentSuggestion {
  category: 'readability' | 'organization' | 'seo';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  reason: string;
}