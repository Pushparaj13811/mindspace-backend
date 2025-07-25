import { BaseController } from './BaseController.js';
import { 
  createJournalSchema, 
  updateJournalSchema, 
  journalQuerySchema,
  idParamSchema 
} from '../utils/validation.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import type { CreateJournalInput, UpdateJournalInput, JournalQueryInput } from '../utils/validation.js';
import type { JournalEntry, User } from '../types/index.js';
import type { DatabaseQuery } from '../core/interfaces/IDatabaseService.js';

/**
 * Journal Controller
 * Handles all journal-related operations using the new service architecture
 */
export class JournalController extends BaseController {
  
  /**
   * Create a new journal entry
   */
  async createEntry(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission using new permission system
      await this.requirePermission(user, 'create_journal');
      
      this.logAction('create_journal_entry', user);
      
      // Validate request body
      const validatedData = this.validateRequestBody(createJournalSchema, body);
      
      // Create journal entry through database service
      const journalData = {
        ...validatedData,
        userId: user.$id,
        encrypted: false,
        tags: validatedData.tags || [],
        attachments: {
          images: validatedData.attachments?.images?.filter(img => img && img.trim()) || [],
          voiceRecording: validatedData.attachments?.voiceRecording
        },
        mood: {
          ...validatedData.mood,
          timestamp: validatedData.mood.timestamp || new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const journalEntry = await this.services.databaseService.create<JournalEntry>('journals', journalData);
      
      this.logAction('journal_entry_created', user, { 
        entryId: journalEntry.$id 
      });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { entry: journalEntry }, 
        SUCCESS_MESSAGES.JOURNAL_CREATED, 
        HTTP_STATUS.CREATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'create_journal_entry');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get journal entries with pagination and filtering
   */
  async getEntries(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission
      await this.requirePermission(user, 'view_own_data');
      
      this.logAction('get_journal_entries', user);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(journalQuerySchema as any, query || {}) as JournalQueryInput;
      const { page, limit } = this.parsePagination(queryParams.page, queryParams.limit);
      const { sortBy, sortOrder } = this.parseSort(queryParams.sortBy, queryParams.sortOrder);
      
      // Build database queries
      const queries: DatabaseQuery[] = [
        { field: 'userId', operator: 'equal', value: user.$id }
      ];
      
      if (queryParams.search) {
        queries.push({ field: 'title', operator: 'contains', value: queryParams.search });
      }
      
      if (queryParams.tags) {
        queryParams.tags.forEach((tag: string) => {
          queries.push({ field: 'tags', operator: 'contains', value: tag });
        });
      }
      
      if (queryParams.dateFrom) {
        queries.push({ field: '$createdAt', operator: 'greaterEqual', value: queryParams.dateFrom });
      }
      
      if (queryParams.dateTo) {
        queries.push({ field: '$createdAt', operator: 'lessEqual', value: queryParams.dateTo });
      }
      
      // Get journal entries through database service
      const result = await this.services.databaseService.list<JournalEntry>('journals', queries);
      
      this.logAction('journal_entries_retrieved', user, { 
        count: result.documents.length,
        total: result.total 
      });
      
      return this.success({
        entries: result.documents,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: (page * limit) < result.total,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      this.logError(error as Error, 'get_journal_entries');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get a specific journal entry by ID
   */
  async getEntry(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('get_journal_entry', user, { entryId: id });
      
      // Check resource access permission
      await this.requireResourceAccess(user, 'journal', id, 'view');
      
      // Get journal entry through database service
      const journalEntry = await this.services.databaseService.read<JournalEntry>('journals', id);
      
      this.logAction('journal_entry_retrieved', user, { entryId: id });
      
      return this.success({ entry: journalEntry });
      
    } catch (error) {
      this.logError(error as Error, 'get_journal_entry');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update a journal entry
   */
  async updateEntry(context: any) {
    const { params, body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('update_journal_entry', user, { entryId: id });
      
      // Check resource access permission
      await this.requireResourceAccess(user, 'journal', id, 'update');
      
      // Validate request body
      const validatedData = this.validateRequestBody(updateJournalSchema, body);
      
      // Prepare update data
      const updateData: any = { ...validatedData };
      
      // Handle mood timestamp if provided
      if (updateData.mood && !updateData.mood.timestamp) {
        updateData.mood.timestamp = new Date().toISOString();
      }
      
      // Update journal entry through database service
      const updatedEntry = await this.services.databaseService.update<JournalEntry>('journals', id, updateData);
      
      this.logAction('journal_entry_updated', user, { entryId: id });
      
      return this.success(
        { entry: updatedEntry }, 
        SUCCESS_MESSAGES.JOURNAL_UPDATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'update_journal_entry');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('delete_journal_entry', user, { entryId: id });
      
      // Check resource access permission
      await this.requireResourceAccess(user, 'journal', id, 'delete');
      
      // Delete journal entry through database service
      await this.services.databaseService.delete('journals', id);
      
      this.logAction('journal_entry_deleted', user, { entryId: id });
      
      set.status = HTTP_STATUS.NO_CONTENT;
      return this.success(
        { message: SUCCESS_MESSAGES.JOURNAL_DELETED },
        SUCCESS_MESSAGES.JOURNAL_DELETED,
        HTTP_STATUS.NO_CONTENT
      );
      
    } catch (error) {
      this.logError(error as Error, 'delete_journal_entry');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Search journal entries
   */
  async searchEntries(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission
      await this.requirePermission(user, 'view_own_data');
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(journalQuerySchema as any, query || {}) as JournalQueryInput;
      
      if (!queryParams.search) {
        throw new Error('Validation error: Search query is required');
      }
      
      this.logAction('search_journal_entries', user, { 
        query: queryParams.search 
      });
      
      // Search journal entries through database service
      const result = await this.services.databaseService.search<JournalEntry>(
        'journals', 
        queryParams.search, 
        ['title', 'content']
      );
      
      // Filter to user's entries only
      const userEntries = result.documents.filter(entry => entry.userId === user.$id);
      
      this.logAction('journal_search_completed', user, { 
        query: queryParams.search,
        results: userEntries.length 
      });
      
      const { page, limit } = this.parsePagination(queryParams.page, queryParams.limit);
      
      return this.success({
        entries: userEntries,
        searchQuery: queryParams.search,
        pagination: {
          total: userEntries.length,
          page,
          limit,
          hasNext: (page * limit) < userEntries.length,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      this.logError(error as Error, 'search_journal_entries');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get all journal entries (Admin only)
   */
  async getAllEntriesAdmin(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check admin permissions
      await this.requirePermission(user, 'view_company_data');
      
      this.logAction('get_all_journal_entries_admin', user);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(journalQuerySchema as any, query || {}) as any;
      const { page, limit } = this.parsePagination(queryParams.page, queryParams.limit);
      
      // Build queries based on user role and permissions
      const queries: DatabaseQuery[] = [];
      
      if (queryParams.userId) {
        queries.push({ field: 'userId', operator: 'equal', value: queryParams.userId });
      }
      
      if (queryParams.companyId && user.role === 'SUPER_ADMIN') {
        // Super admin can filter by company - would need to join with users
        // For now, just get all entries
      } else if (user.role === 'COMPANY_ADMIN' && user.companyId) {
        // Company admin can only see their company's entries
        // This would require a more complex query joining users and journals
      }
      
      if (queryParams.dateFrom) {
        queries.push({ field: '$createdAt', operator: 'greaterEqual', value: queryParams.dateFrom });
      }
      
      if (queryParams.dateTo) {
        queries.push({ field: '$createdAt', operator: 'lessEqual', value: queryParams.dateTo });
      }
      
      // Get journal entries through database service
      const result = await this.services.databaseService.list<JournalEntry>('journals', queries);
      
      this.logAction('all_journal_entries_retrieved_admin', user, { 
        count: result.documents.length,
        total: result.total 
      });
      
      return this.success({
        entries: result.documents,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: (page * limit) < result.total,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      this.logError(error as Error, 'get_all_journal_entries_admin');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get journal analytics
   */
  async getJournalAnalytics(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permissions - users can see their own analytics, admins can see company analytics
      const hasCompanyPermission = await this.hasPermission(user, 'view_company_data');
      
      if (!hasCompanyPermission) {
        await this.requirePermission(user, 'view_own_data');
      }
      
      this.logAction('get_journal_analytics', user);
      
      // Build analytics based on permission level
      const queries: DatabaseQuery[] = [];
      
      if (!hasCompanyPermission) {
        // Individual user analytics
        queries.push({ field: 'userId', operator: 'equal', value: user.$id });
      } else if (user.role === 'COMPANY_ADMIN' && user.companyId) {
        // Company admin analytics - would need to join with users to filter by company
        // For now, we'll use a simplified approach
      }
      
      // Get journal entries for analytics
      const result = await this.services.databaseService.list<JournalEntry>('journals', queries);
      
      // Calculate basic analytics
      const analytics = {
        totalEntries: result.total,
        entriesThisMonth: result.documents.filter(entry => {
          const entryDate = new Date(entry.createdAt);
          const now = new Date();
          return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
        }).length,
        averageEntriesPerWeek: Math.round(result.total / 4), // Simplified
        moodDistribution: this.calculateMoodDistribution(result.documents),
        popularTags: this.calculatePopularTags(result.documents)
      };
      
      this.logAction('journal_analytics_retrieved', user, { 
        totalEntries: analytics.totalEntries 
      });
      
      return this.success({ analytics });
      
    } catch (error) {
      this.logError(error as Error, 'get_journal_analytics');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Calculate mood distribution for analytics
   */
  private calculateMoodDistribution(entries: JournalEntry[]) {
    const moodCounts: Record<string, number> = {};
    
    entries.forEach(entry => {
      const mood = entry.mood?.current;
      if (mood) {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    });
    
    return moodCounts;
  }

  /**
   * Calculate popular tags for analytics
   */
  private calculatePopularTags(entries: JournalEntry[]) {
    const tagCounts: Record<string, number> = {};
    
    entries.forEach(entry => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }
}