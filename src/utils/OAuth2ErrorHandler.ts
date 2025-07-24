import { HTTP_STATUS, ERROR_MESSAGES } from './response.js';
import { logger } from './logger.js';

/**
 * OAuth2 Error Handler
 * Handles OAuth2-specific errors and provides appropriate HTTP status codes and messages
 */
export class OAuth2ErrorHandler {
  /**
   * Handle OAuth2-specific errors and return appropriate status and message
   */
  static handleOAuth2Error(error: Error): { status: number; message: string; errorCode: string } {
    const errorMessage = error.message.toLowerCase();

    // Log the OAuth2 error for monitoring
    logger.error('OAuth2 error occurred', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // OAuth2 provider not configured
    if (errorMessage.includes('oauth2 provider not configured') ||
      errorMessage.includes('provider not found') ||
      errorMessage.includes('invalid provider')) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.OAUTH2_PROVIDER_NOT_CONFIGURED,
        errorCode: 'OAUTH2_PROVIDER_NOT_CONFIGURED'
      };
    }

    // OAuth2 session expired or invalid
    if (errorMessage.includes('oauth2 session expired') ||
      errorMessage.includes('session expired') ||
      errorMessage.includes('token expired')) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        message: ERROR_MESSAGES.OAUTH2_SESSION_EXPIRED,
        errorCode: 'OAUTH2_SESSION_EXPIRED'
      };
    }

    // OAuth2 callback invalid parameters
    if (errorMessage.includes('oauth2 callback invalid') ||
      errorMessage.includes('invalid callback') ||
      errorMessage.includes('missing callback parameters') ||
      errorMessage.includes('invalid userid') ||
      errorMessage.includes('invalid secret')) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.OAUTH2_CALLBACK_INVALID,
        errorCode: 'OAUTH2_CALLBACK_INVALID'
      };
    }

    // OAuth2 access denied by user
    if (errorMessage.includes('access denied') ||
      errorMessage.includes('user denied') ||
      errorMessage.includes('authorization denied')) {
      return {
        status: HTTP_STATUS.FORBIDDEN,
        message: 'OAuth2 authorization was denied by the user',
        errorCode: 'OAUTH2_ACCESS_DENIED'
      };
    }

    // OAuth2 state parameter mismatch (CSRF protection)
    if (errorMessage.includes('state mismatch') ||
      errorMessage.includes('invalid state') ||
      errorMessage.includes('csrf')) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'OAuth2 state parameter mismatch. Please try again.',
        errorCode: 'OAUTH2_STATE_MISMATCH'
      };
    }

    // OAuth2 redirect URI mismatch
    if (errorMessage.includes('redirect uri mismatch') ||
      errorMessage.includes('invalid redirect') ||
      errorMessage.includes('redirect_uri')) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'OAuth2 redirect URI mismatch',
        errorCode: 'OAUTH2_REDIRECT_MISMATCH'
      };
    }

    // OAuth2 rate limiting
    if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('quota exceeded')) {
      return {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        message: 'OAuth2 rate limit exceeded. Please try again later.',
        errorCode: 'OAUTH2_RATE_LIMIT'
      };
    }

    // OAuth2 network or service errors
    if (errorMessage.includes('network error') ||
      errorMessage.includes('connection failed') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('timeout')) {
      return {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'OAuth2 service is temporarily unavailable. Please try again later.',
        errorCode: 'OAUTH2_SERVICE_UNAVAILABLE'
      };
    }

    // OAuth2 invalid client credentials
    if (errorMessage.includes('invalid client') ||
      errorMessage.includes('client not found') ||
      errorMessage.includes('invalid client_id') ||
      errorMessage.includes('invalid client_secret')) {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'OAuth2 client configuration is invalid',
        errorCode: 'OAUTH2_INVALID_CLIENT'
      };
    }

    // OAuth2 scope issues
    if (errorMessage.includes('invalid scope') ||
      errorMessage.includes('insufficient scope') ||
      errorMessage.includes('scope not granted')) {
      return {
        status: HTTP_STATUS.FORBIDDEN,
        message: 'OAuth2 insufficient permissions granted',
        errorCode: 'OAUTH2_INSUFFICIENT_SCOPE'
      };
    }

    // Default OAuth2 error - catch all for any other OAuth2-related errors
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.OAUTH2_AUTHENTICATION_FAILED,
      errorCode: 'OAUTH2_AUTHENTICATION_FAILED'
    };
  }

  /**
   * Check if an error is OAuth2-related
   */
  static isOAuth2Error(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    return errorMessage.includes('oauth2') ||
      errorMessage.includes('oauth') ||
      errorMessage.includes('provider') ||
      errorMessage.includes('callback') ||
      errorMessage.includes('redirect') ||
      errorMessage.includes('authorization') ||
      errorMessage.includes('access_token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('client_id') ||
      errorMessage.includes('client_secret') ||
      errorMessage.includes('state') ||
      errorMessage.includes('scope');
  }

  /**
   * Log OAuth2 error with structured metadata
   */
  static logOAuth2Error(
    error: Error,
    context: {
      action: string;
      provider?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const errorType = this.categorizeError(error);
    const severity = this.getErrorSeverity(error);

    logger.error('OAuth2 Error', {
      error: error.message,
      stack: error.stack,
      action: context.action,
      provider: context.provider || 'unknown',
      userId: context.userId,
      errorType,
      severity,
      timestamp: new Date().toISOString(),
      type: 'oauth2_error',
      ...context.metadata
    });
  }

  /**
   * Log OAuth2 success events with comprehensive metadata
   */
  static logOAuth2Success(
    action: string,
    context: {
      provider: string;
      userId?: string;
      email?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    logger.info('OAuth2 Success', {
      action,
      provider: context.provider,
      userId: context.userId,
      email: context.email,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
      type: 'oauth2_success',
      ...context.metadata
    });
  }

  /**
   * Log OAuth2 security events
   */
  static logSecurityEvent(
    event: string,
    context: {
      provider: string;
      userId?: string;
      severity?: 'low' | 'medium' | 'high';
      metadata?: Record<string, any>;
    }
  ): void {
    const severity = context.severity || 'medium';
    const logLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';

    logger[logLevel]('OAuth2 Security Event', {
      event,
      provider: context.provider,
      userId: context.userId,
      severity,
      timestamp: new Date().toISOString(),
      type: 'oauth2_security_event',
      ...context.metadata
    });
  }

  /**
   * Categorize OAuth2 errors for better monitoring
   */
  private static categorizeError(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('provider') || errorMessage.includes('configuration')) {
      return 'configuration_error';
    }
    if (errorMessage.includes('session') || errorMessage.includes('token') || errorMessage.includes('expired')) {
      return 'session_error';
    }
    if (errorMessage.includes('callback') || errorMessage.includes('redirect') || errorMessage.includes('state')) {
      return 'callback_error';
    }
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      return 'permission_error';
    }
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('unavailable')) {
      return 'network_error';
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return 'rate_limit_error';
    }
    if (errorMessage.includes('client') || errorMessage.includes('credentials')) {
      return 'client_error';
    }

    return 'unknown_error';
  }

  /**
   * Determine error severity for monitoring and alerting
   */
  private static getErrorSeverity(error: Error): 'low' | 'medium' | 'high' {
    const errorMessage = error.message.toLowerCase();

    // High severity - security or system critical issues
    if (errorMessage.includes('csrf') ||
      errorMessage.includes('state mismatch') ||
      errorMessage.includes('invalid client') ||
      errorMessage.includes('unauthorized')) {
      return 'high';
    }

    // Medium severity - operational issues that affect user experience
    if (errorMessage.includes('provider not configured') ||
      errorMessage.includes('callback invalid') ||
      errorMessage.includes('access denied') ||
      errorMessage.includes('service unavailable')) {
      return 'medium';
    }

    // Low severity - expected errors or user-related issues
    return 'low';
  }

  /**
   * Generate user-friendly error messages based on error context
   */
  static generateUserFriendlyMessage(error: Error, provider: string = 'OAuth2'): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('access denied') || errorMessage.includes('user denied')) {
      return `You cancelled the ${provider} login process. Please try again if you want to sign in.`;
    }

    if (errorMessage.includes('provider not configured') || 
      errorMessage.includes('invalid client') ||
      errorMessage.includes('configuration')) {
      return `${provider} login is temporarily unavailable. Please try a different sign-in method or contact support.`;
    }

    if (errorMessage.includes('session expired') || errorMessage.includes('token expired')) {
      return `Your ${provider} session has expired. Please sign in again.`;
    }

    if (errorMessage.includes('network') || 
      errorMessage.includes('timeout') || 
      errorMessage.includes('unavailable')) {
      return `Unable to connect to ${provider}. Please check your internet connection and try again.`;
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return `Too many ${provider} login attempts. Please wait a few minutes before trying again.`;
    }

    // Generic fallback message
    return `${provider} login failed. Please try again or use a different sign-in method.`;
  }

  /**
   * Sanitize error information for client response (remove sensitive data)
   */
  static sanitizeErrorForClient(error: Error): { message: string; code: string } {
    const handled = this.handleOAuth2Error(error);
    
    return {
      message: handled.message,
      code: handled.errorCode
    };
  }

  /**
   * Extract OAuth2 provider from error context
   */
  static extractProviderFromError(error: Error): string | null {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('google')) return 'google';
    if (errorMessage.includes('facebook')) return 'facebook';
    if (errorMessage.includes('github')) return 'github';
    if (errorMessage.includes('twitter')) return 'twitter';
    if (errorMessage.includes('microsoft')) return 'microsoft';
    if (errorMessage.includes('apple')) return 'apple';
    
    return null;
  }
}