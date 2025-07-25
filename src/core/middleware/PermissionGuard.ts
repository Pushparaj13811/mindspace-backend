import type { User, Permission } from '../../types/index.js';
import type { IPermissionService } from '../interfaces/IPermissionService.js';
import { Permission as PermissionDomain } from '../domain/Permission.js';

/**
 * Permission guard for protecting routes and resources
 */
export class PermissionGuard {
  constructor(private permissionService: IPermissionService) {}

  /**
   * Check if user has required permission
   */
  async requirePermission(user: User, permission: Permission): Promise<void> {
    const hasPermission = await this.permissionService.hasPermission(user, permission);
    if (!hasPermission) {
      throw new Error(`Access denied: Missing required permission '${permission}'`);
    }
  }

  /**
   * Check if user has any of the required permissions
   */
  async requireAnyPermission(user: User, permissions: Permission[]): Promise<void> {
    const hasAnyPermission = await this.permissionService.hasAnyPermission(user, permissions);
    if (!hasAnyPermission) {
      throw new Error(`Access denied: Missing required permissions '${permissions.join("', '")}'`);
    }
  }

  /**
   * Check if user has all required permissions
   */
  async requireAllPermissions(user: User, permissions: Permission[]): Promise<void> {
    const hasAllPermissions = await this.permissionService.hasAllPermissions(user, permissions);
    if (!hasAllPermissions) {
      throw new Error(`Access denied: Missing required permissions '${permissions.join("', '")}'`);
    }
  }

  /**
   * Check if user has required role
   */
  async requireRole(user: User, role: string): Promise<void> {
    if (user.role !== role) {
      throw new Error(`Access denied: Required role '${role}', but user has '${user.role}'`);
    }
  }

  /**
   * Check if user has any of the required roles
   */
  async requireAnyRole(user: User, roles: string[]): Promise<void> {
    if (!roles.includes(user.role)) {
      throw new Error(`Access denied: Required roles '${roles.join("', '")}', but user has '${user.role}'`);
    }
  }

  /**
   * Check if user can access company resources
   */
  async requireCompanyAccess(user: User, companyId: string): Promise<void> {
    const canAccess = await this.permissionService.canAccessCompany(user, companyId);
    if (!canAccess) {
      throw new Error('Access denied: Cannot access company resources');
    }
  }

  /**
   * Check if user can manage another user
   */
  async requireUserManagement(manager: User, targetUserId: string): Promise<void> {
    const canManage = await this.permissionService.canManageUser(manager, targetUserId);
    if (!canManage) {
      throw new Error('Access denied: Cannot manage this user');
    }
  }

  /**
   * Check if user can view another user's data
   */
  async requireUserDataAccess(viewer: User, targetUserId: string): Promise<void> {
    const canView = await this.permissionService.canViewUserData(viewer, targetUserId);
    if (!canView) {
      throw new Error('Access denied: Cannot view user data');
    }
  }

  /**
   * Check if user can access a specific resource
   */
  async requireResourceAccess(user: User, resourceType: string, resourceId: string, action: string): Promise<void> {
    const canAccess = await this.permissionService.canAccessResource(user, resourceType, resourceId, action);
    if (!canAccess) {
      throw new Error(`Access denied: Cannot ${action} ${resourceType} resource`);
    }
  }

  /**
   * Check if user account is active
   */
  async requireActiveUser(user: User): Promise<void> {
    if (!user.isActive) {
      throw new Error('Access denied: User account is inactive');
    }
  }

  /**
   * Check if user email is verified (for certain operations)
   */
  async requireVerifiedEmail(user: User): Promise<void> {
    if (!user.emailVerified) {
      throw new Error('Access denied: Email verification required');
    }
  }

  /**
   * Check subscription tier requirements
   */
  async requireSubscriptionTier(user: User, requiredTier: 'free' | 'premium' | 'enterprise'): Promise<void> {
    const tierLevels = { free: 1, premium: 2, enterprise: 3 };
    const userTierLevel = tierLevels[user.subscription.tier];
    const requiredTierLevel = tierLevels[requiredTier];
    
    if (userTierLevel < requiredTierLevel) {
      throw new Error(`Access denied: ${requiredTier} subscription required`);
    }
  }

  /**
   * Combined guard for common scenarios
   */
  async requireActiveUserWithPermission(user: User, permission: Permission): Promise<void> {
    await this.requireActiveUser(user);
    await this.requirePermission(user, permission);
  }

  /**
   * Owner or admin access pattern
   */
  async requireOwnerOrAdmin(user: User, resourceOwnerId: string): Promise<void> {
    // User can access their own resources
    if (user.$id === resourceOwnerId) {
      return;
    }
    
    // Super admin can access any resource
    if (user.role === 'SUPER_ADMIN') {
      return;
    }
    
    // Company admin can access their company users' resources
    if (user.role === 'COMPANY_ADMIN' && user.companyId) {
      const hasPermission = await this.permissionService.hasPermission(user, 'view_company_data');
      if (hasPermission) {
        return;
      }
    }
    
    throw new Error('Access denied: Must be resource owner or administrator');
  }

  /**
   * Same company access pattern
   */
  async requireSameCompanyAccess(user: User, targetUser: User): Promise<void> {
    // Super admin can access anyone
    if (user.role === 'SUPER_ADMIN') {
      return;
    }
    
    // Must be in the same company
    if (user.companyId && user.companyId === targetUser.companyId) {
      return;
    }
    
    throw new Error('Access denied: Users must be in the same company');
  }
}

/**
 * Permission guard error types
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public code: string = 'PERMISSION_DENIED',
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class RoleError extends PermissionError {
  constructor(message: string, public requiredRole: string, public userRole: string) {
    super(message, 'INSUFFICIENT_ROLE', 403);
    this.name = 'RoleError';
  }
}

export class ResourceAccessError extends PermissionError {
  constructor(message: string, public resourceType: string, public resourceId: string) {
    super(message, 'RESOURCE_ACCESS_DENIED', 403);
    this.name = 'ResourceAccessError';
  }
}

/**
 * Guard decorator factory for route handlers
 */
export function createPermissionDecorators(guard: PermissionGuard) {
  return {
    /**
     * Require specific permission
     */
    requirePermission: (permission: Permission) => {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function (...args: any[]) {
          const context = args[0]; // First argument should be context
          // Get user from context (assuming it's set by authentication middleware)
          const user = context?.user;
          if (user) {
            await guard.requirePermission(user, permission);
          }
          return originalMethod.apply(this, args);
        };
        
        return descriptor;
      };
    },

    /**
     * Require specific role
     */
    requireRole: (role: string) => {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function (...args: any[]) {
          const context = args[0]; // First argument should be context
          // Get user from context (assuming it's set by authentication middleware)
          const user = context?.user;
          if (user) {
            await guard.requireRole(user, role);
          }
          return originalMethod.apply(this, args);
        };
        
        return descriptor;
      };
    },

    /**
     * Require active user
     */
    requireActiveUser: () => {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function (...args: any[]) {
          const context = args[0]; // First argument should be context
          // Get user from context (assuming it's set by authentication middleware)
          const user = context?.user;
          if (user) {
            await guard.requireActiveUser(user);
          }
          return originalMethod.apply(this, args);
        };
        
        return descriptor;
      };
    }
  };
}