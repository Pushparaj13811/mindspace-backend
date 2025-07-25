import type { User, Permission as PermissionType, UserRole } from '../../types/index.js';
import type { PermissionRule, PermissionContext, PermissionCondition } from '../interfaces/IPermissionService.js';

/**
 * Permission domain entity with business logic
 * Contains all permission-related business rules and evaluations
 */
export class Permission {
  // Role hierarchy levels (higher number = more privileges)
  private static readonly ROLE_HIERARCHY: Record<UserRole, number> = {
    'INDIVIDUAL_USER': 1,
    'COMPANY_USER': 2,
    'COMPANY_MANAGER': 3,
    'COMPANY_ADMIN': 4,
    'SUPER_ADMIN': 5
  };

  // Base permissions for each role
  private static readonly ROLE_PERMISSIONS: Record<UserRole, PermissionType[]> = {
    'SUPER_ADMIN': [
      'manage_platform', 'view_platform_analytics', 'manage_companies', 'manage_super_admins',
      'manage_company', 'view_company_analytics', 'manage_company_users', 'manage_departments',
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data'
    ],
    'COMPANY_ADMIN': [
      'manage_company', 'view_company_analytics', 'manage_company_users', 'manage_departments',
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data'
    ],
    'COMPANY_MANAGER': [
      'view_company_analytics', 'manage_departments',
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data'
    ],
    'COMPANY_USER': [
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data'
    ],
    'INDIVIDUAL_USER': [
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account'
    ]
  };

  // Static permission checking methods
  static hasPermission(user: User, permission: PermissionType): boolean {
    // Check if user is active
    if (!user.isActive) {
      return false;
    }

    // Check explicit permissions first
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // Fallback to role-based permissions
    const rolePermissions = this.ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  }

  static hasAnyPermission(user: User, permissions: PermissionType[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  static hasAllPermissions(user: User, permissions: PermissionType[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  static getRolePermissions(role: UserRole): PermissionType[] {
    return [...(this.ROLE_PERMISSIONS[role] || [])];
  }

  static getRoleLevel(role: UserRole): number {
    return this.ROLE_HIERARCHY[role] || 0;
  }

  static isHigherRole(role1: UserRole, role2: UserRole): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  // Resource-based access control
  static canAccessCompany(user: User, companyId: string): boolean {
    if (!user.isActive) return false;
    
    // Super admin can access any company
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Users can only access their own company
    return user.companyId === companyId;
  }

  static canManageUser(manager: User, targetUser: User): boolean {
    if (!manager.isActive || !targetUser.isActive) return false;

    // Super admin can manage anyone
    if (manager.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Must be in same company for company roles
    if (manager.companyId !== targetUser.companyId) {
      return false;
    }
    
    // Company admin can manage anyone in their company (except super admins)
    if (manager.role === 'COMPANY_ADMIN' && targetUser.role !== 'SUPER_ADMIN') {
      return true;
    }
    
    // Company manager can manage company users only
    if (manager.role === 'COMPANY_MANAGER' && targetUser.role === 'COMPANY_USER') {
      return true;
    }
    
    return false;
  }

  static canViewUserData(viewer: User, targetUser: User): boolean {
    if (!viewer.isActive) return false;

    // Users can always view their own data
    if (viewer.$id === targetUser.$id) {
      return true;
    }
    
    // Super admin can view anyone's data
    if (viewer.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Company admin and managers can view their company users' data
    if ((viewer.role === 'COMPANY_ADMIN' || viewer.role === 'COMPANY_MANAGER') && 
        viewer.companyId === targetUser.companyId &&
        this.hasPermission(viewer, 'view_company_data')) {
      return true;
    }
    
    return false;
  }

  // Role assignment validation
  static canAssignRole(assigner: User, targetRole: UserRole, targetCompanyId?: string): boolean {
    if (!assigner.isActive) return false;

    // Super admin can assign any role
    if (assigner.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Company admin can assign company roles within their company
    if (assigner.role === 'COMPANY_ADMIN' && assigner.companyId === targetCompanyId) {
      const assignableRoles: UserRole[] = ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'];
      return assignableRoles.includes(targetRole);
    }
    
    return false;
  }

  static getAssignableRoles(user: User): UserRole[] {
    if (!user.isActive) return [];

    if (user.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER', 'INDIVIDUAL_USER'];
    }
    
    if (user.role === 'COMPANY_ADMIN') {
      return ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'];
    }
    
    return [];
  }

  // Dynamic rule evaluation (ABAC support)
  static evaluateRule(rule: PermissionRule, context: PermissionContext): boolean {
    if (!rule.isActive) {
      return false;
    }

    // Evaluate all conditions
    const conditionResults = rule.conditions.map(condition => 
      this.evaluateCondition(condition, context)
    );

    // Apply logical operators
    let result = conditionResults[0] ?? false;
    for (let i = 1; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const conditionResult = conditionResults[i];
      
      if (condition && condition.logicalOperator === 'OR') {
        result = result || (conditionResult ?? false);
      } else { // Default to AND
        result = result && (conditionResult ?? false);
      }
    }

    return rule.effect === 'allow' ? result : !result;
  }

  private static evaluateCondition(condition: PermissionCondition, context: PermissionContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'greater':
        return Number(fieldValue) > Number(condition.value);
      case 'less':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private static getFieldValue(field: string, context: PermissionContext): any {
    const parts = field.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // Permission validation
  static validatePermission(permission: string): permission is PermissionType {
    const validPermissions: PermissionType[] = [
      'manage_platform', 'view_platform_analytics', 'manage_companies', 'manage_super_admins',
      'manage_company', 'view_company_analytics', 'manage_company_users', 'manage_departments',
      'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data'
    ];
    return validPermissions.includes(permission as PermissionType);
  }

  static validatePermissions(permissions: string[]): { valid: PermissionType[]; invalid: string[] } {
    const valid: PermissionType[] = [];
    const invalid: string[] = [];
    
    permissions.forEach(permission => {
      if (this.validatePermission(permission)) {
        valid.push(permission as PermissionType);
      } else {
        invalid.push(permission);
      }
    });
    
    return { valid, invalid };
  }

  // Permission inheritance and effective permissions
  static getEffectivePermissions(user: User, additionalPermissions: PermissionType[] = []): PermissionType[] {
    const rolePermissions = this.getRolePermissions(user.role);
    const userPermissions = user.permissions || [];
    
    // Combine all permissions and remove duplicates
    const allPermissions = Array.from(new Set([
      ...rolePermissions,
      ...userPermissions,
      ...additionalPermissions
    ]));
    
    return allPermissions;
  }

  // Audit helpers
  static getPermissionSource(user: User, permission: PermissionType): 'role' | 'direct' | 'none' {
    if (user.permissions?.includes(permission)) {
      return 'direct';
    }
    
    if (this.ROLE_PERMISSIONS[user.role]?.includes(permission)) {
      return 'role';
    }
    
    return 'none';
  }
}