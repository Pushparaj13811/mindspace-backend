import { BaseController } from './BaseController.js';
import { 
  createJournalSchema, 
  updateJournalSchema, 
  journalQuerySchema,
  idParamSchema 
} from '../utils/validation.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import type { CreateJournalInput, UpdateJournalInput, JournalQueryInput } from '../utils/validation.js';

/**
 * Journal Controller
 * Handles all journal-related operations
 */
export class JournalController extends BaseController {
  
  /**
   * Create a new journal entry
   */
  async createEntry(context: { 
    user?: any; 
    session?: string; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('create_journal_entry', authUser.$id);
      
      // Validate request body
      const validatedData = this.validateRequestBody(createJournalSchema, body);
      
      // Create journal entry through service
      const journalEntry = await this.services.databaseService.createJournalEntry({
        ...validatedData,
        userId: authUser.$id,
        encrypted: false,
        tags: validatedData.tags || [],
        attachments: {
          images: validatedData.attachments?.images || [],
          voiceRecording: validatedData.attachments?.voiceRecording
        },
      });
      
      this.logAction('journal_entry_created', authUser.$id, { 
        entryId: journalEntry.$id 
      });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { entry: journalEntry }, 
        SUCCESS_MESSAGES.JOURNAL_CREATED, 
        HTTP_STATUS.CREATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get journal entries with pagination and filtering
   */
  async getEntries(context: { 
    user?: any; 
    session?: string; 
    query?: unknown; 
    set: any 
  }) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('get_journal_entries', authUser.$id);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(journalQuerySchema as any, query || {}) as JournalQueryInput;
      
      // Get journal entries through service
      const result = await this.services.databaseService.getJournalEntries(
        authUser.$id, 
        queryParams
      );
      
      this.logAction('journal_entries_retrieved', authUser.$id, { 
        count: result.documents.length,
        total: result.total 
      });
      
      return this.success({
        entries: result.documents,
        pagination: {
          total: result.total,
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          hasNext: ((queryParams.page || 1) * (queryParams.limit || 20)) < result.total,
          hasPrev: (queryParams.page || 1) > 1,
        }
      });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get a specific journal entry by ID
   */
  async getEntry(context: { 
    user?: any; 
    session?: string; 
    params: unknown; 
    set: any 
  }) {
    const { user, session, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('get_journal_entry', authUser.$id, { entryId: id });
      
      // Get journal entry through service
      const journalEntry = await this.services.databaseService.getJournalEntry(
        id, 
        authUser.$id
      );
      
      if (!journalEntry) {
        set.status = HTTP_STATUS.NOT_FOUND;
        return this.error(ERROR_MESSAGES.JOURNAL_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
      
      this.logAction('journal_entry_retrieved', authUser.$id, { entryId: id });
      
      return this.success({ entry: journalEntry });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Access denied')) {
          set.status = HTTP_STATUS.FORBIDDEN;
          return this.error(ERROR_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update a journal entry
   */
  async updateEntry(context: { 
    user?: any; 
    session?: string; 
    params: unknown; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, params, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('update_journal_entry', authUser.$id, { entryId: id });
      
      // Validate request body
      const validatedData = this.validateRequestBody(updateJournalSchema, body);
      
      // Update journal entry through service
      const updatedEntry = await this.services.databaseService.updateJournalEntry(
        id, 
        authUser.$id, 
        validatedData
      );
      
      this.logAction('journal_entry_updated', authUser.$id, { entryId: id });
      
      return this.success(
        { entry: updatedEntry }, 
        SUCCESS_MESSAGES.JOURNAL_UPDATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('not found') || error.message.includes('Access denied')) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return this.error(ERROR_MESSAGES.JOURNAL_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(context: { 
    user?: any; 
    session?: string; 
    params: unknown; 
    set: any 
  }) {
    const { user, session, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('delete_journal_entry', authUser.$id, { entryId: id });
      
      // Delete journal entry through service
      await this.services.databaseService.deleteJournalEntry(id, authUser.$id);
      
      this.logAction('journal_entry_deleted', authUser.$id, { entryId: id });
      
      set.status = HTTP_STATUS.NO_CONTENT;
      return this.success(
        { message: SUCCESS_MESSAGES.JOURNAL_DELETED },
        SUCCESS_MESSAGES.JOURNAL_DELETED,
        HTTP_STATUS.NO_CONTENT
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('not found') || error.message.includes('Access denied')) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return this.error(ERROR_MESSAGES.JOURNAL_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Search journal entries
   */
  async searchEntries(context: { 
    user?: any; 
    session?: string; 
    query?: unknown; 
    set: any 
  }) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(journalQuerySchema as any, query || {}) as JournalQueryInput;
      
      if (!queryParams.search) {
        throw new Error('Validation error: Search query is required');
      }
      
      this.logAction('search_journal_entries', authUser.$id, { 
        query: queryParams.search 
      });
      
      // Search journal entries through service
      const result = await this.services.databaseService.getJournalEntries(
        authUser.$id, 
        queryParams
      );
      
      this.logAction('journal_search_completed', authUser.$id, { 
        query: queryParams.search,
        results: result.documents.length 
      });
      
      return this.success({
        entries: result.documents,
        searchQuery: queryParams.search,
        pagination: {
          total: result.total,
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          hasNext: ((queryParams.page || 1) * (queryParams.limit || 20)) < result.total,
          hasPrev: (queryParams.page || 1) > 1,
        }
      });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }
}