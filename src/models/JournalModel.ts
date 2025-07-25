import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';

/**
 * Mood states available in the system
 */
export type MoodState = 'happy' | 'sad' | 'anxious' | 'calm' | 'energetic' | 'depressed';

/**
 * Mood data structure
 */
export interface MoodData {
  current: MoodState;
  intensity: number; // 1-10
  timestamp: string;
  triggers?: string[];
  notes?: string;
}

/**
 * AI insights for journal analysis
 */
export interface AIInsights {
  sentiment: number;
  emotions: string[];
  themes: string[];
  suggestions: string[];
}

/**
 * Journal attachments
 */
export interface JournalAttachments {
  images: string[];
  voiceRecording?: string;
}

/**
 * Journal model interface
 */
export interface JournalModel extends BaseModel {
  userId: string;
  title: string;
  content: string;
  mood: MoodData;
  tags: string[];
  aiInsights?: AIInsights;
  attachments: JournalAttachments;
  encrypted: boolean;
}

/**
 * Journal creation input
 */
export type CreateJournalInput = CreateInput<JournalModel>;

/**
 * Journal update input
 */
export type UpdateJournalInput = UpdateInput<JournalModel>;

/**
 * Basic schema for database operations
 */
export const JournalSchema = {
  name: 'journals',
  permissions: ['read', 'write', 'create', 'update', 'delete']
};