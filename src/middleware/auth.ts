import type { Context } from 'elysia';
import { container, SERVICE_KEYS } from '../container/ServiceContainer.js';
import type { IAuthService } from '../interfaces/IAuthService.js';
import { createErrorResponse, HTTP_STATUS, ERROR_MESSAGES } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { User } from '../types/index.js';

// Context interface for auth middleware
interface AuthContext {
  user?: User;
  session?: string;
  headers?: Record<string, string>;
  path?: string;
  request?: Request;
  set?: any;
}

export const authMiddleware = async (context: any) => {
  try {
    const authHeader = context.headers?.authorization;
    
    if (!authHeader) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED,
        'Authorization header is required'
      );
    }

    const sessionId = extractSessionFromHeader(authHeader);
    if (!sessionId) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.TOKEN_INVALID,
        'Invalid authorization header format'
      );
    }

    // Get auth service and validate session
    const authService = container.resolve<IAuthService>(SERVICE_KEYS.AUTH_SERVICE);
    const { user } = await authService.validateSession(sessionId);
    
    // Add user and session to context
    context.user = user;
    context.session = sessionId;
    
  } catch (error) {
    logger.error('Authentication failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      path: context.path || 'unknown',
      method: context.request?.method || 'unknown'
    });

    if (error instanceof Error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        return createErrorResponse(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_MESSAGES.TOKEN_EXPIRED
        );
      }
    }

    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }
};

function extractSessionFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (context: any) => {
  try {
    const authHeader = context.headers?.authorization;
    
    if (authHeader) {
      const sessionId = extractSessionFromHeader(authHeader);
      if (sessionId) {
        try {
          const authService = container.resolve<IAuthService>(SERVICE_KEYS.AUTH_SERVICE);
          const { user } = await authService.validateSession(sessionId);
          context.user = user;
        } catch (error) {
          // Ignore auth errors in optional middleware
          logger.debug('Optional auth failed', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            path: context.path || 'unknown'
          });
        }
      }
    }
  } catch (error) {
    // Ignore all errors in optional auth
    logger.debug('Optional auth middleware error', { error });
  }
};

// Role-based access control
export const requireRole = (requiredRole: 'free' | 'premium' | 'enterprise') => {
  return async (context: any) => {
    if (!context.user) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED
      );
    }

    const userRole = context.user.subscription.tier;
    
    // Define role hierarchy
    const roleHierarchy = {
      free: 0,
      premium: 1,
      enterprise: 2,
    };

    if ((roleHierarchy as any)[userRole] < (roleHierarchy as any)[requiredRole]) {
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        `This feature requires ${requiredRole} subscription`
      );
    }
  };
};

// Check subscription validity
export const checkSubscription = async (context: any) => {
  if (!context.user) {
    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }

  const user = context.user;
  
  // Free tier doesn't need validity check
  if (user.subscription.tier === 'free') {
    return;
  }

  // Check if subscription is still valid
  if (user.subscription.validUntil) {
    const validUntil = new Date(user.subscription.validUntil);
    const now = new Date();
    
    if (now > validUntil) {
      // Subscription expired - could downgrade to free tier here
      logger.warn('Expired subscription detected', { 
        userId: user.$id,
        tier: user.subscription.tier,
        validUntil: user.subscription.validUntil
      });
      
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        'Subscription has expired',
        'Please renew your subscription to continue using premium features'
      );
    }
  }
};

// Rate limiting based on user tier
export const tierBasedRateLimit = {
  free: { requests: 100, window: 15 * 60 * 1000 }, // 100 req/15min
  premium: { requests: 500, window: 15 * 60 * 1000 }, // 500 req/15min
  enterprise: { requests: 2000, window: 15 * 60 * 1000 }, // 2000 req/15min
};

// Simple in-memory rate limiter (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = async (context: any) => {
  const user = context.user;
  const tier = user?.subscription.tier || 'free';
  const userId = user?.$id || context.headers?.['x-forwarded-for'] || 'anonymous';
  
  const limit = (tierBasedRateLimit as any)[tier];
  const now = Date.now();
  const key = `${userId}:${tier}`;
  
  let userLimit = rateLimitStore.get(key);
  
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = {
      count: 1,
      resetTime: now + limit.window,
    };
    rateLimitStore.set(key, userLimit);
  } else {
    userLimit.count++;
    
    if (userLimit.count > limit.requests) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);
      
      return createErrorResponse(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded. Try again in ${resetIn} seconds.`
      );
    }
  }
  
  // Add rate limit headers (if context.set exists)
  if (context.set?.headers) {
    context.set.headers['X-RateLimit-Limit'] = limit.requests.toString();
    context.set.headers['X-RateLimit-Remaining'] = (limit.requests - userLimit.count).toString();
    context.set.headers['X-RateLimit-Reset'] = Math.ceil(userLimit.resetTime / 1000).toString();
  }
};

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes