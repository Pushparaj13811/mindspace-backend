import { Client, Databases, Query, ID } from 'node-appwrite';
import type { IDatabaseService, QueryOptions, QueryResult } from '../interfaces/IDatabaseService.js';
import type { JournalEntry, MoodState } from '../types/index.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class AppwriteDatabaseService implements IDatabaseService {
  private client: Client;
  private databases: Databases;

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.databases = new Databases(this.client);
  }

  // Journal operations
  async createJournalEntry(
    entry: Omit<JournalEntry, '$id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> {
    try {
      const document = await this.databases.createDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        ID.unique(),
        {
          ...entry,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      logger.info('Journal entry created', { 
        journalId: document.$id, 
        userId: entry.userId 
      });

      return document as unknown as JournalEntry;
    } catch (error) {
      logger.error('Failed to create journal entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: entry.userId 
      });

      throw new Error('Failed to create journal entry');
    }
  }

  async getJournalEntries(
    userId: string, 
    options: QueryOptions = {}
  ): Promise<QueryResult<JournalEntry>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        filters,
        dateFrom,
        dateTo,
      } = options;

      const queries = [
        Query.equal('userId', userId),
        Query.limit(limit),
        Query.offset((page - 1) * limit),
      ];

      // Add sorting
      if (sortOrder === 'desc') {
        queries.push(Query.orderDesc(sortBy));
      } else {
        queries.push(Query.orderAsc(sortBy));
      }

      // Add search
      if (search) {
        queries.push(Query.search('title', search));
      }

      // Add filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            queries.push(Query.contains(key, value));
          } else {
            queries.push(Query.equal(key, value));
          }
        });
      }

      // Add date filters
      if (dateFrom) {
        queries.push(Query.greaterThanEqual('createdAt', dateFrom));
      }
      if (dateTo) {
        queries.push(Query.lessThanEqual('createdAt', dateTo));
      }

      const result = await this.databases.listDocuments(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        queries
      );

      logger.info('Journal entries retrieved', { 
        userId, 
        count: result.documents.length,
        total: result.total 
      });

      return {
        documents: result.documents as unknown as JournalEntry[],
        total: result.total,
      };
    } catch (error) {
      logger.error('Failed to get journal entries', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });

      throw new Error('Failed to retrieve journal entries');
    }
  }

  async getJournalEntry(entryId: string, userId: string): Promise<JournalEntry | null> {
    try {
      const document = await this.databases.getDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        entryId
      );

      // Verify ownership
      if ((document as any).userId !== userId) {
        throw new Error('Access denied');
      }

      return document as unknown as JournalEntry;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      logger.error('Failed to get journal entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        entryId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('Access denied')) {
        throw error;
      }

      throw new Error('Failed to retrieve journal entry');
    }
  }

  async updateJournalEntry(
    entryId: string, 
    userId: string, 
    updates: Partial<JournalEntry>
  ): Promise<JournalEntry> {
    try {
      // First verify ownership
      const existingEntry = await this.getJournalEntry(entryId, userId);
      if (!existingEntry) {
        throw new Error('Journal entry not found or access denied');
      }

      const document = await this.databases.updateDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        entryId,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      );

      logger.info('Journal entry updated', { entryId, userId });
      return document as unknown as JournalEntry;
    } catch (error) {
      logger.error('Failed to update journal entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        entryId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw new Error('Failed to update journal entry');
    }
  }

  async deleteJournalEntry(entryId: string, userId: string): Promise<void> {
    try {
      // First verify ownership
      const existingEntry = await this.getJournalEntry(entryId, userId);
      if (!existingEntry) {
        throw new Error('Journal entry not found or access denied');
      }

      await this.databases.deleteDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        entryId
      );

      logger.info('Journal entry deleted', { entryId, userId });
    } catch (error) {
      logger.error('Failed to delete journal entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        entryId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw new Error('Failed to delete journal entry');
    }
  }

  // Mood operations
  async createMoodEntry(
    mood: Omit<MoodState, 'timestamp'> & { userId: string }
  ): Promise<{ id: string; timestamp: string }> {
    try {
      const timestamp = new Date().toISOString();
      const document = await this.databases.createDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        ID.unique(),
        {
          ...mood,
          timestamp,
        }
      );

      logger.info('Mood entry created', { 
        moodId: document.$id, 
        userId: mood.userId 
      });

      return { id: document.$id, timestamp };
    } catch (error) {
      logger.error('Failed to create mood entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: mood.userId 
      });

      throw new Error('Failed to log mood');
    }
  }

  async getMoodHistory(
    userId: string, 
    options: QueryOptions = {}
  ): Promise<QueryResult<MoodState & { id: string }>> {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
      } = options;

      const queries = [
        Query.equal('userId', userId),
        Query.limit(limit),
        Query.offset((page - 1) * limit),
      ];

      // Add sorting
      if (sortOrder === 'desc') {
        queries.push(Query.orderDesc(sortBy));
      } else {
        queries.push(Query.orderAsc(sortBy));
      }

      // Add date filters
      if (dateFrom) {
        queries.push(Query.greaterThanEqual('timestamp', dateFrom));
      }
      if (dateTo) {
        queries.push(Query.lessThanEqual('timestamp', dateTo));
      }

      const result = await this.databases.listDocuments(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        queries
      );

      logger.info('Mood history retrieved', { 
        userId, 
        count: result.documents.length,
        total: result.total 
      });

      return {
        documents: result.documents.map(doc => ({
          ...(doc as any),
          id: doc.$id,
        })) as (MoodState & { id: string })[],
        total: result.total,
      };
    } catch (error) {
      logger.error('Failed to get mood history', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });

      throw new Error('Failed to retrieve mood history');
    }
  }

  async getMoodEntry(
    moodId: string, 
    userId: string
  ): Promise<(MoodState & { id: string }) | null> {
    try {
      const document = await this.databases.getDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        moodId
      );

      // Verify ownership
      if ((document as any).userId !== userId) {
        throw new Error('Access denied');
      }

      return {
        ...(document as any),
        id: document.$id,
      } as MoodState & { id: string };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      logger.error('Failed to get mood entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        moodId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('Access denied')) {
        throw error;
      }

      throw new Error('Failed to retrieve mood entry');
    }
  }

  async updateMoodEntry(
    moodId: string, 
    userId: string, 
    updates: Partial<MoodState>
  ): Promise<MoodState & { id: string }> {
    try {
      // First verify ownership
      const existingMood = await this.getMoodEntry(moodId, userId);
      if (!existingMood) {
        throw new Error('Mood entry not found or access denied');
      }

      const document = await this.databases.updateDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        moodId,
        updates
      );

      logger.info('Mood entry updated', { moodId, userId });
      
      return {
        ...(document as any),
        id: document.$id,
      } as MoodState & { id: string };
    } catch (error) {
      logger.error('Failed to update mood entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        moodId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw new Error('Failed to update mood entry');
    }
  }

  async deleteMoodEntry(moodId: string, userId: string): Promise<void> {
    try {
      // First verify ownership
      const existingMood = await this.getMoodEntry(moodId, userId);
      if (!existingMood) {
        throw new Error('Mood entry not found or access denied');
      }

      await this.databases.deleteDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        moodId
      );

      logger.info('Mood entry deleted', { moodId, userId });
    } catch (error) {
      logger.error('Failed to delete mood entry', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        moodId, 
        userId 
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw new Error('Failed to delete mood entry');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.databases.list();
      return true;
    } catch (error) {
      logger.error('Database health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}