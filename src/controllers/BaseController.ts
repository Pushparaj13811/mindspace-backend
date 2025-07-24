import type { ServiceContainer } from '../container/ServiceContainer.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  HTTP_STATUS, 
  ERROR_MESSAGES 
} from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { validateBody, validateQuery, validateParams } from '../utils/validation.js';
import { OAuth2ErrorHandler } from '../utils/OAuth2ErrorHandler.js';
import type { z } from 'zod';

/**
 * Base controller class providing common functionality
 * All controllers should extend this class
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
   * Handle business logic errors
   */
  protected handleBusinessError(error: Error, set: any) {
    logger.error('Business logic error', { error: error.message });
    
    // Check if this is an OAuth2-related error first
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

    if (error.message.includes('already exists')) {
      set.status = HTTP_STATUS.CONFLICT;
      return createErrorResponse(
        HTTP_STATUS.CONFLICT,
        error.message
      );
    }

    if (error.message.includes('access denied') || error.message.includes('forbidden')) {
      set.status = HTTP_STATUS.FORBIDDEN;
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.ACCESS_DENIED
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
   * Ensure user is authenticated
   */
  protected requireAuth(user: any, session: any, set: any) {
    if (!user || !session) {
      set.status = HTTP_STATUS.UNAUTHORIZED;
      throw new Error('Authentication required');
    }
    return { user, session };
  }

  /**
   * Log controller action
   */
  protected logAction(action: string, userId?: string, metadata?: Record<string, any>) {
    logger.info(`Controller action: ${action}`, {
      action,
      userId,
      controller: this.constructor.name,
      ...metadata
    });
  }

  /**
   * Log controller errors
   */
  protected logError(error: Error, action: string, userId?: string, metadata?: Record<string, any>) {
    logger.error(`Controller error: ${action}`, {
      action,
      userId,
      controller: this.constructor.name,
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }
}