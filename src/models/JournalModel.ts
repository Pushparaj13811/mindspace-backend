import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';

/**
 * Mood states available in the system
 */
export type MoodState = 'happy' | 'sad' | 'anxious' | 'calm' | 'energetic' | 'depressed' | 'excited' | 'angry' | 'peaceful' | 'stressed';

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
 * Complete database schema for journals collection
 */
export const JournalSchema = {
  name: 'journals',
  permissions: ['read', 'write', 'create', 'update', 'delete'],
  attributes: [
    { key: 'userId', type: 'string', size: 36, required: true },
    { key: 'title', type: 'string', size: 200, required: true },
    { key: 'content', type: 'string', size: 10000, required: true },
    
    // Mood attributes (flattened for Appwrite)
    { key: 'moodCurrent', type: 'string', size: 20, required: true },
    { key: 'moodIntensity', type: 'integer', required: true, min: 1, max: 10 },
    { key: 'moodTimestamp', type: 'datetime', required: true },
    { key: 'moodTriggers', type: 'string', size: 100, array: true, required: false },
    { key: 'moodNotes', type: 'string', size: 500, required: false },
    
    // Tags and attachments
    { key: 'tags', type: 'string', size: 50, array: true, required: false },
    { key: 'attachmentImages', type: 'string', size: 500, array: true, required: false },
    { key: 'attachmentVoiceRecording', type: 'string', size: 500, required: false },
    
    // AI insights (disabled for now due to attribute limits - can be added later if needed)
    // { key: 'aiInsightsSentiment', type: 'float', required: false },
    // { key: 'aiInsightsEmotions', type: 'string', size: 50, array: true, required: false },
    // { key: 'aiInsightsThemes', type: 'string', size: 100, array: true, required: false },
    // { key: 'aiInsightsSuggestions', type: 'string', size: 500, array: true, required: false },
    
    // Metadata
    { key: 'encrypted', type: 'boolean', required: true }
  ],
  indexes: [
    { key: 'user_index', type: 'key', attributes: ['userId'] },
    { key: 'created_at_index', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    { key: 'mood_index', type: 'key', attributes: ['moodCurrent'] },
    { key: 'title_search', type: 'fulltext', attributes: ['title'] },
    { key: 'content_search', type: 'fulltext', attributes: ['content'] },
    { key: 'user_created_index', type: 'key', attributes: ['userId', '$createdAt'], orders: ['ASC', 'DESC'] }
  ]
};