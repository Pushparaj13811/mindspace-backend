import type { Context } from 'elysia';
import { container, SERVICE_KEYS } from '../container/ServiceContainer.js';
import type { IAuthService } from '../interfaces/IAuthService.js';
import { createErrorResponse, HTTP_STATUS, ERROR_MESSAGES } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { User, UserRole, Permission } from '../types/index.js';
import { hasPermission, hasAnyPermission, canAccessCompany, canManageUser } from '../utils/permissions.js';

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

// Permission-based access control
export const requirePermission = (permission: Permission) => {
  return async (context: any) => {
    if (!context.user) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED
      );
    }

    if (!hasPermission(context.user, permission)) {
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        `This action requires '${permission}' permission`
      );
    }
  };
};

// Require any of the specified permissions
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (context: any) => {
    if (!context.user) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED
      );
    }

    if (!hasAnyPermission(context.user, permissions)) {
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        `This action requires one of these permissions: ${permissions.join(', ')}`
      );
    }
  };
};

// Role-based access control (legacy support)
export const requireRole = (requiredRole: UserRole) => {
  return async (context: any) => {
    if (!context.user) {
      return createErrorResponse(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED
      );
    }

    if (context.user.role !== requiredRole) {
      return createErrorResponse(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        `This action requires '${requiredRole}' role`
      );
    }
  };
};

// Company access control
export const requireCompanyAccess = (context: any) => {
  if (!context.user) {
    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }

  const companyId = context.params?.companyId || context.body?.companyId;
  if (companyId && !canAccessCompany(context.user, companyId)) {
    return createErrorResponse(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
      'You do not have access to this company'
    );
  }
};

// Super admin only access
export const requireSuperAdmin = async (context: any) => {
  if (!context.user) {
    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }

  if (context.user.role !== 'SUPER_ADMIN') {
    return createErrorResponse(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
      'This action requires super admin privileges'
    );
  }
};

// Company admin or above access
export const requireCompanyAdmin = async (context: any) => {
  if (!context.user) {
    return createErrorResponse(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED
    );
  }

  const validRoles: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];
  if (!validRoles.includes(context.user.role)) {
    return createErrorResponse(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
      'This action requires company admin privileges or higher'
    );
  }
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

// Rate limiting based on user role and subscription
export const roleBasedRateLimit = {
  INDIVIDUAL_USER: {
    free: { requests: 100, window: 15 * 60 * 1000 },
    premium: { requests: 500, window: 15 * 60 * 1000 },
    enterprise: { requests: 1000, window: 15 * 60 * 1000 }
  },
  COMPANY_USER: {
    free: { requests: 200, window: 15 * 60 * 1000 },
    premium: { requests: 1000, window: 15 * 60 * 1000 },
    enterprise: { requests: 2000, window: 15 * 60 * 1000 }
  },
  COMPANY_MANAGER: {
    free: { requests: 300, window: 15 * 60 * 1000 },
    premium: { requests: 1500, window: 15 * 60 * 1000 },
    enterprise: { requests: 3000, window: 15 * 60 * 1000 }
  },
  COMPANY_ADMIN: {
    free: { requests: 500, window: 15 * 60 * 1000 },
    premium: { requests: 2000, window: 15 * 60 * 1000 },
    enterprise: { requests: 5000, window: 15 * 60 * 1000 }
  },
  SUPER_ADMIN: {
    free: { requests: 10000, window: 15 * 60 * 1000 },
    premium: { requests: 10000, window: 15 * 60 * 1000 },
    enterprise: { requests: 10000, window: 15 * 60 * 1000 }
  }
};

// Simple in-memory rate limiter (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = async (context: any) => {
  const user = context.user;
  const role = user?.role || 'INDIVIDUAL_USER';
  const tier = user?.subscription.tier || 'free';
  const userId = user?.$id || context.headers?.['x-forwarded-for'] || 'anonymous';
  
  const roleLimit = (roleBasedRateLimit as any)[role];
  const limit = roleLimit ? roleLimit[tier] : roleBasedRateLimit.INDIVIDUAL_USER.free;
  
  const now = Date.now();
  const key = `${userId}:${role}:${tier}`;
  
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