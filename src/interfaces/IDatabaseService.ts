import type { JournalEntry, MoodState } from '../types/index.js';

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
  dateFrom?: string;
  dateTo?: string;
}

export interface QueryResult<T> {
  documents: T[];
  total: number;
}

export interface IDatabaseService {
  // Journal operations
  createJournalEntry(entry: Omit<JournalEntry, '$id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry>;
  getJournalEntries(userId: string, options?: QueryOptions): Promise<QueryResult<JournalEntry>>;
  getJournalEntry(entryId: string, userId: string): Promise<JournalEntry | null>;
  updateJournalEntry(entryId: string, userId: string, updates: Partial<JournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(entryId: string, userId: string): Promise<void>;
  
  // Mood operations
  createMoodEntry(mood: Omit<MoodState, 'timestamp'> & { userId: string }): Promise<{ id: string; timestamp: string }>;
  getMoodHistory(userId: string, options?: QueryOptions): Promise<QueryResult<MoodState & { id: string }>>;
  getMoodEntry(moodId: string, userId: string): Promise<(MoodState & { id: string }) | null>;
  updateMoodEntry(moodId: string, userId: string, updates: Partial<MoodState>): Promise<MoodState & { id: string }>;
  deleteMoodEntry(moodId: string, userId: string): Promise<void>;
  
  // Generic operations
  healthCheck(): Promise<boolean>;
}