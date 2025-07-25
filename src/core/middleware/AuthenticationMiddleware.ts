import type { User } from '../../types/index.js';
import type { IAuthService } from '../interfaces/IAuthService.js';
import { PermissionGuard, PermissionError } from './PermissionGuard.js';
import { logger } from '../../utils/logger.js';

// Define a context type that includes the properties we need
interface AuthContext {
  request?: Request;
  headers?: Record<string, string>;
  user?: User;
}

/**
 * Authentication middleware that extracts and validates user session
 */
export class AuthenticationMiddleware {
  constructor(
    private authService: IAuthService,
    private permissionGuard: PermissionGuard
  ) {}

  /**
   * Extract and validate JWT token from request
   */
  async authenticate(ctx: AuthContext): Promise<User | null> {
    try {
      const authHeader = ctx.request?.headers.get('authorization') || ctx.headers?.['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      if (!token) {
        return null;
      }

      // Validate session and get user
      const { user } = await this.authService.validateSession(token);
      
      // Ensure user is active
      if (!user.isActive) {
        throw new PermissionError('User account is inactive', 'INACTIVE_USER', 401);
      }

      return user;
    } catch (error) {
      logger.warn('Authentication failed:', error);
      return null;
    }
  }

  /**
   * Require authentication - throw error if not authenticated
   */
  async requireAuth(ctx: AuthContext): Promise<User> {
    const user = await this.authenticate(ctx);
    if (!user) {
      throw new PermissionError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
    }
    return user;
  }

  /**
   * Optional authentication - return user if available, null otherwise
   */
  async optionalAuth(ctx: AuthContext): Promise<User | null> {
    return await this.authenticate(ctx);
  }

  /**
   * Enhanced authentication with permission checking
   */
  async requireAuthWithPermission(ctx: AuthContext, permission: string): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requirePermission(user, permission as any);
    return user;
  }

  /**
   * Require authentication with role checking
   */
  async requireAuthWithRole(ctx: AuthContext, role: string): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireRole(user, role);
    return user;
  }

  /**
   * Require authentication with any permission checking
   */
  async requireAuthWithAnyPermission(ctx: AuthContext, permissions: string[]): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireAnyPermission(user, permissions as any);
    return user;
  }

  /**
   * Require authentication with any of the specified roles
   */
  async requireAuthWithAnyRole(ctx: AuthContext, roles: string[]): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireAnyRole(user, roles);
    return user;
  }

  /**
   * Super admin only access
   */
  async requireSuperAdmin(ctx: AuthContext): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireRole(user, 'SUPER_ADMIN');
    return user;
  }

  /**
   * Company admin or higher access
   */
  async requireCompanyAdmin(ctx: AuthContext): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireAnyRole(user, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
    return user;
  }

  /**
   * Company manager or higher access
   */
  async requireCompanyManager(ctx: AuthContext): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireAnyRole(user, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER']);
    return user;
  }

  /**
   * Company member access (any company role + super admin)
   */
  async requireCompanyMember(ctx: AuthContext): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireAnyRole(user, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER']);
    return user;
  }

  /**
   * Require user to own resource or be admin
   */
  async requireOwnership(ctx: AuthContext, resourceOwnerId: string): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireOwnerOrAdmin(user, resourceOwnerId);
    return user;
  }

  /**
   * Require access to specific company
   */
  async requireCompanyAccess(ctx: AuthContext, companyId: string): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireCompanyAccess(user, companyId);
    return user;
  }

  /**
   * Require email verification for sensitive operations
   */
  async requireVerifiedUser(ctx: AuthContext): Promise<User> {
    const user = await this.requireAuth(ctx);
    await this.permissionGuard.requireVerifiedEmail(user);
    return user;
  }

  /**
   * Create middleware functions for Elysia
   */
  createMiddleware() {
    return {
      // Basic authentication middleware
      auth: async (ctx: AuthContext) => {
        const user = await this.requireAuth(ctx);
        ctx.user = user;
        return user;
      },

      // Optional authentication middleware
      optionalAuth: async (ctx: AuthContext) => {
        const user = await this.optionalAuth(ctx);
        ctx.user = user || undefined;
        return user;
      },

      // Permission-based middleware
      requirePermission: (permission: string) => async (ctx: AuthContext) => {
        const user = await this.requireAuthWithPermission(ctx, permission);
        ctx.user = user;
        return user;
      },

      // Role-based middleware
      requireRole: (role: string) => async (ctx: AuthContext) => {
        const user = await this.requireAuthWithRole(ctx, role);
        ctx.user = user;
        return user;
      },

      requireAnyRole: (roles: string[]) => async (ctx: AuthContext) => {
        const user = await this.requireAuthWithAnyRole(ctx, roles);
        ctx.user = user;
        return user;
      },

      // Convenience middleware for common roles
      superAdmin: async (ctx: AuthContext) => {
        const user = await this.requireSuperAdmin(ctx);
        ctx.user = user;
        return user;
      },

      companyAdmin: async (ctx: AuthContext) => {
        const user = await this.requireCompanyAdmin(ctx);
        ctx.user = user;
        return user;
      },

      companyManager: async (ctx: AuthContext) => {
        const user = await this.requireCompanyManager(ctx);
        ctx.user = user;
        return user;
      },

      companyMember: async (ctx: AuthContext) => {
        const user = await this.requireCompanyMember(ctx);
        ctx.user = user;
        return user;
      },

      // Resource-based middleware
      requireOwnership: (getResourceOwnerId: (ctx: AuthContext) => string) => async (ctx: AuthContext) => {
        const resourceOwnerId = getResourceOwnerId(ctx);
        const user = await this.requireOwnership(ctx, resourceOwnerId);
        ctx.user = user;
        return user;
      },

      requireCompanyAccess: (getCompanyId: (ctx: AuthContext) => string) => async (ctx: AuthContext) => {
        const companyId = getCompanyId(ctx);
        const user = await this.requireCompanyAccess(ctx, companyId);
        ctx.user = user;
        return user;
      },

      // Email verification middleware
      requireVerified: async (ctx: AuthContext) => {
        const user = await this.requireVerifiedUser(ctx);
        ctx.user = user;
        return user;
      }
    };
  }

  /**
   * Error handler for authentication and permission errors
   */
  createErrorHandler() {
    return (error: Error) => {
      if (error instanceof PermissionError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Re-throw other errors to be handled by global error handler
      throw error;
    };
  }
}

/**
 * Rate limiting based on user role
 */
export class RoleBasedRateLimit {
  private static readonly RATE_LIMITS = {
    'SUPER_ADMIN': { requests: 1000, windowMs: 60000 }, // 1000 req/min
    'COMPANY_ADMIN': { requests: 500, windowMs: 60000 }, // 500 req/min
    'COMPANY_MANAGER': { requests: 300, windowMs: 60000 }, // 300 req/min
    'COMPANY_USER': { requests: 200, windowMs: 60000 }, // 200 req/min
    'INDIVIDUAL_USER': { requests: 100, windowMs: 60000 }, // 100 req/min
    'GUEST': { requests: 50, windowMs: 60000 } // 50 req/min for unauthenticated
  };

  static getRateLimit(user: User | null) {
    const role = user?.role || 'GUEST';
    return this.RATE_LIMITS[role] || this.RATE_LIMITS.GUEST;
  }

  static createRateLimitMiddleware() {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return async (ctx: AuthContext) => {
      const user = ctx.user as User | null;
      const limits = this.getRateLimit(user);
      const key = user ? `user:${user.$id}` : `ip:${ctx.request?.headers.get('x-forwarded-for') || 'unknown'}`;
      
      const now = Date.now();
      const current = requests.get(key);

      if (!current || now > current.resetTime) {
        requests.set(key, {
          count: 1,
          resetTime: now + limits.windowMs
        });
      } else {
        current.count++;
        if (current.count > limits.requests) {
          throw new PermissionError(
            'Rate limit exceeded',
            'RATE_LIMIT_EXCEEDED',
            429
          );
        }
      }
    };
  }
}