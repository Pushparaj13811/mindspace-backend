import type { ServiceContainer } from '../core/container/ServiceContainer.js';
import type { User } from '../types/index.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  HTTP_STATUS, 
  ERROR_MESSAGES 
} from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { validateBody, validateQuery, validateParams } from '../utils/validation.js';
import { OAuth2ErrorHandler } from '../utils/OAuth2ErrorHandler.js';
import { PermissionError } from '../core/middleware/PermissionGuard.js';
import { BusinessError, isBusinessError } from '../utils/BusinessError.js';
import type { z } from 'zod';

/**
 * Base controller class providing common functionality
 * All controllers should extend this class and use the new service container
 */
export abstract class BaseController {
  protected services: ServiceContainer;

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * Handle validation errors and return appropriate response
   */
  protected handleValidationError(error: Error, set: any) {
    logger.error('Validation error', { error: error.message });
    
    set.status = HTTP_STATUS.BAD_REQUEST;
    return createErrorResponse(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.VALIDATION_ERROR,
      error.message
    );
  }

  /**
   * Handle authentication errors
   */
  protected handleAuthError(error: Error, set: any) {
    logger.error('Authentication error', { error: error.message });
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      set.status = HTTP_STATUS.UNAUTHORIZED;
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.TOKEN_EXPIRED
      );
    }

    set.status = HTTP_STATUS.UNAUTHORIZED;
    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }

  /**
   * Handle permission errors from the new permission system
   */
  protected handlePermissionError(error: PermissionError, set: any) {
    logger.error('Permission error', { 
      error: error.message,
      code: error.code,
      controller: this.constructor.name
    });
    
    set.status = error.statusCode;
    return createErrorResponse(
      error.statusCode,
      error.message,
      error.code
    );
  }

  /**
   * Handle business logic errors
   */
  protected handleBusinessError(error: Error, set: any) {
    logger.error('Business logic error', { 
      error: error.message,
      stack: error.stack,
      controller: this.constructor.name
    });
    
    // Handle permission errors first
    if (error instanceof PermissionError) {
      return this.handlePermissionError(error, set);
    }
    
    // Handle business errors with proper status codes
    if (isBusinessError(error)) {
      set.status = error.statusCode;
      return createErrorResponse(
        error.statusCode,
        error.message,
        error.code
      );
    }
    
    // Check if this is an OAuth2-related error
    if (OAuth2ErrorHandler.isOAuth2Error(error)) {
      OAuth2ErrorHandler.logOAuth2Error(error, {
        action: 'business_error_fallback',
        provider: 'unknown'
      });
      
      const { status, message } = OAuth2ErrorHandler.handleOAuth2Error(error);
      set.status = status;
      return createErrorResponse(status, message);
    }
    
    if (error.message.includes('not found')) {
      set.status = HTTP_STATUS.NOT_FOUND;
      return createErrorResponse(
        HTTP_STATUS.NOT_FOUND,
        error.message
      );
    }

    if (error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.message.includes('conflict')) {
      set.status = HTTP_STATUS.CONFLICT;
      return createErrorResponse(
        HTTP_STATUS.CONFLICT,
        error.message
      );
    }
    
    if (error.message.includes('Invalid email or password') || 
        error.message.includes('Invalid credentials') ||
        error.message.includes('invalid credentials')) {
      set.status = HTTP_STATUS.UNAUTHORIZED;
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        error.message
      );
    }

    if (error.message.includes('access denied') || 
        error.message.includes('forbidden') ||
        error.message.includes('insufficient permission')) {
      set.status = HTTP_STATUS.FORBIDDEN;
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        error.message
      );
    }

    if (error.message.includes('unauthorized') ||
        error.message.includes('token') && error.message.includes('invalid') ||
        error.message.includes('session') && error.message.includes('expired')) {
      set.status = HTTP_STATUS.UNAUTHORIZED;
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        error.message
      );
    }

    if (error.message.includes('validation') ||
        error.message.includes('invalid format') ||
        error.message.includes('required field') ||
        error.message.includes('bad request')) {
      set.status = HTTP_STATUS.BAD_REQUEST;
      return createErrorResponse(
        HTTP_STATUS.BAD_REQUEST,
        error.message
      );
    }

    if (error.message.includes('too many requests') ||
        error.message.includes('rate limit')) {
      set.status = HTTP_STATUS.TOO_MANY_REQUESTS;
      return createErrorResponse(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        error.message
      );
    }

    // Default to internal server error
    set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return createErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR
    );
  }

  /**
   * Validate request body using Zod schema
   */
  protected validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
    return validateBody(schema)(body);
  }

  /**
   * Validate query parameters using Zod schema
   */
  protected validateQueryParams<T>(schema: z.ZodSchema<T>, query: unknown): T {
    return validateQuery(schema)(query);
  }

  /**
   * Validate URL parameters using Zod schema
   */
  protected validateUrlParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
    return validateParams(schema)(params);
  }

  /**
   * Create success response
   */
  protected success<T>(data: T, message?: string, status: number = HTTP_STATUS.OK) {
    return createSuccessResponse(status, data, message);
  }

  /**
   * Create error response
   */
  protected error(error: string, status: number = HTTP_STATUS.BAD_REQUEST, message?: string) {
    return createErrorResponse(status, error, message);
  }

  /**
   * Get current user from context (set by authentication middleware)
   */
  protected getCurrentUser(context: any): User {
    const user = context.user;
    if (!user) {
      throw new Error('User not found in context. Ensure authentication middleware is applied.');
    }
    return user;
  }

  /**
   * Check if user has permission (uses new permission service)
   */
  protected async hasPermission(user: User, permission: string): Promise<boolean> {
    return await this.services.permissionService.hasPermission(user, permission as any);
  }

  /**
   * Require user to have specific permission
   */
  protected async requirePermission(user: User, permission: string): Promise<void> {
    const hasAccess = await this.hasPermission(user, permission);
    if (!hasAccess) {
      throw new PermissionError(`Access denied: Missing required permission '${permission}'`);
    }
  }

  /**
   * Check if user can access company data
   */
  protected async canAccessCompany(user: User, companyId: string): Promise<boolean> {
    return await this.services.permissionService.canAccessCompany(user, companyId);
  }

  /**
   * Require user to have access to company
   */
  protected async requireCompanyAccess(user: User, companyId: string): Promise<void> {
    const hasAccess = await this.canAccessCompany(user, companyId);
    if (!hasAccess) {
      throw new PermissionError('Access denied: Cannot access company resources');
    }
  }

  /**
   * Check if user can access resource
   */
  protected async canAccessResource(user: User, resourceType: string, resourceId: string, action: string): Promise<boolean> {
    return await this.services.permissionService.canAccessResource(user, resourceType, resourceId, action);
  }

  /**
   * Require user to have access to resource
   */
  protected async requireResourceAccess(user: User, resourceType: string, resourceId: string, action: string): Promise<void> {
    const hasAccess = await this.canAccessResource(user, resourceType, resourceId, action);
    if (!hasAccess) {
      throw new PermissionError(`Access denied: Cannot ${action} ${resourceType} resource`);
    }
  }

  /**
   * Log controller action with user context
   */
  protected logAction(action: string, user?: User, metadata?: Record<string, any>) {
    logger.info(`Controller action: ${action}`, {
      action,
      userId: user?.$id,
      userRole: user?.role,
      controller: this.constructor.name,
      ...metadata
    });
  }

  /**
   * Log controller errors with user context
   */
  protected logError(error: Error, action: string, user?: User, metadata?: Record<string, any>) {
    logger.error(`Controller error: ${action}`, {
      action,
      userId: user?.$id,
      userRole: user?.role,
      controller: this.constructor.name,
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }

  /**
   * Parse pagination parameters with defaults
   */
  protected parsePagination(page?: number, limit?: number) {
    return {
      page: page || 1,
      limit: Math.min(limit || 20, 100), // Cap at 100
      offset: ((page || 1) - 1) * (limit || 20)
    };
  }

  /**
   * Parse sort parameters with defaults
   */
  protected parseSort(sortBy?: string, sortOrder?: string) {
    return {
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc'
    };
  }
}