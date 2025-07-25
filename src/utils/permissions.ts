import type { UserRole, Permission, User } from '../types/index.js';

/**
 * Role-based permission system for MindSpace
 * Defines what each role can do in the system
 */

// Permission definitions by role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // Platform permissions
    'manage_platform',
    'view_platform_analytics', 
    'manage_companies',
    'manage_super_admins',
    // Company permissions (can access any company)
    'manage_company',
    'view_company_analytics',
    'manage_company_users',
    'manage_departments',
    // User permissions
    'manage_profile',
    'create_journal',
    'view_own_data',
    'delete_account',
    'view_company_data'
  ],
  
  COMPANY_ADMIN: [
    // Company permissions (for their own company)
    'manage_company',
    'view_company_analytics', 
    'manage_company_users',
    'manage_departments',
    // User permissions
    'manage_profile',
    'create_journal',
    'view_own_data',
    'delete_account',
    'view_company_data'
  ],
  
  COMPANY_MANAGER: [
    // Limited company permissions
    'view_company_analytics',
    'manage_departments', // Can manage their department
    // User permissions
    'manage_profile',
    'create_journal', 
    'view_own_data',
    'delete_account',
    'view_company_data'
  ],
  
  COMPANY_USER: [
    // Basic user permissions within company
    'manage_profile',
    'create_journal',
    'view_own_data', 
    'delete_account',
    'view_company_data'
  ],
  
  INDIVIDUAL_USER: [
    // Individual user permissions (no company access)
    'manage_profile',
    'create_journal',
    'view_own_data',
    'delete_account'
  ]
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User, permission: Permission): boolean {
  if (!user.permissions) {
    // Fallback to role-based permissions if user.permissions is not set
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
  }
  
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user based on their role
 */
export function getUserPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can access a specific company
 */
export function canAccessCompany(user: User, companyId: string): boolean {
  // Super admin can access any company
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Users can only access their own company
  return user.companyId === companyId;
}

/**
 * Check if user can manage other users in their company
 */
export function canManageUser(manager: User, targetUser: User): boolean {
  // Super admin can manage anyone
  if (manager.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Must be in same company
  if (manager.companyId !== targetUser.companyId) {
    return false;
  }
  
  // Company admin can manage anyone in their company (except super admins)
  if (manager.role === 'COMPANY_ADMIN' && targetUser.role !== 'SUPER_ADMIN') {
    return true;
  }
  
  // Company manager can manage company users (not admins or other managers)
  if (manager.role === 'COMPANY_MANAGER' && targetUser.role === 'COMPANY_USER') {
    return true;
  }
  
  return false;
}

/**
 * Check if user can view another user's data
 */
export function canViewUserData(viewer: User, targetUser: User): boolean {
  // Users can always view their own data
  if (viewer.$id === targetUser.$id) {
    return true;
  }
  
  // Super admin can view anyone's data
  if (viewer.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Company admin can view their company users' data
  if (viewer.role === 'COMPANY_ADMIN' && 
      viewer.companyId === targetUser.companyId &&
      hasPermission(viewer, 'view_company_data')) {
    return true;
  }
  
  return false;
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  const levels = {
    INDIVIDUAL_USER: 1,
    COMPANY_USER: 2,
    COMPANY_MANAGER: 3,
    COMPANY_ADMIN: 4,
    SUPER_ADMIN: 5
  };
  
  return levels[role] || 0;
}

/**
 * Check if one role is higher than another
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2);
}

/**
 * Validate role assignment permissions
 */
export function canAssignRole(assigner: User, targetRole: UserRole): boolean {
  // Super admin can assign any role
  if (assigner.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Company admin can assign company roles (but not super admin)
  if (assigner.role === 'COMPANY_ADMIN') {
    return ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'].includes(targetRole);
  }
  
  return false;
}

/**
 * Get available roles that a user can assign
 */
export function getAssignableRoles(user: User): UserRole[] {
  if (user.role === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER', 'INDIVIDUAL_USER'];
  }
  
  if (user.role === 'COMPANY_ADMIN') {
    return ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'];
  }
  
  return [];
}

/**
 * Default permissions when creating a new user
 */
export function getDefaultUserData(role: UserRole, companyId?: string): Partial<User> {
  return {
    role,
    companyId: role === 'INDIVIDUAL_USER' || role === 'SUPER_ADMIN' ? undefined : companyId,
    permissions: getUserPermissions(role),
    isActive: true,
    subscription: {
      tier: 'free'
    },
    preferences: {
      theme: 'auto',
      notifications: true,
      preferredAIModel: 'gpt-4',
      language: 'en'
    }
  };
}