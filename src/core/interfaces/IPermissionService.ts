import type { User, Permission, UserRole } from '../../types/index.js';

/**
 * Abstract permission service interface
 * This interface defines all permission and authorization operations
 */
export interface IPermissionService {
  // Permission checking
  hasPermission(user: User, permission: Permission): Promise<boolean>;
  hasAnyPermission(user: User, permissions: Permission[]): Promise<boolean>;
  hasAllPermissions(user: User, permissions: Permission[]): Promise<boolean>;
  
  // Resource-based permissions
  canAccessResource(user: User, resourceType: string, resourceId: string, action: string): Promise<boolean>;
  canManageUser(manager: User, targetUserId: string): Promise<boolean>;
  canViewUserData(viewer: User, targetUserId: string): Promise<boolean>;
  canAccessCompany(user: User, companyId: string): Promise<boolean>;
  
  // Role management
  getUserRole(userId: string): Promise<UserRole>;
  updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<void>;
  getRolePermissions(role: UserRole): Permission[];
  
  // Permission assignment
  assignPermissions(userId: string, permissions: Permission[], assignedBy: string): Promise<void>;
  revokePermissions(userId: string, permissions: Permission[], revokedBy: string): Promise<void>;
  getEffectivePermissions(userId: string): Promise<Permission[]>;
  
  // Dynamic permission rules (ABAC support)
  evaluateRule(rule: PermissionRule, context: PermissionContext): Promise<boolean>;
  createRule(rule: PermissionRule, createdBy: string): Promise<string>;
  updateRule(ruleId: string, rule: PermissionRule, updatedBy: string): Promise<void>;
  deleteRule(ruleId: string, deletedBy: string): Promise<void>;
  listRules(filters?: { resourceType?: string; action?: string }): Promise<PermissionRule[]>;
  
  // Permission inheritance
  getInheritedPermissions(userId: string): Promise<InheritedPermission[]>;
  
  // Audit and logging
  logPermissionCheck(userId: string, permission: Permission, result: boolean, context?: any): Promise<void>;
  getPermissionAuditLog(userId?: string, startDate?: Date, endDate?: Date): Promise<PermissionAuditEntry[]>;
  
  // Bulk operations
  bulkAssignRole(userIds: string[], role: UserRole, assignedBy: string): Promise<void>;
  bulkAssignPermissions(userIds: string[], permissions: Permission[], assignedBy: string): Promise<void>;
  
  // Permission presets/templates
  createPermissionTemplate(name: string, permissions: Permission[], createdBy: string): Promise<string>;
  applyPermissionTemplate(userId: string, templateId: string, appliedBy: string): Promise<void>;
  listPermissionTemplates(): Promise<PermissionTemplate[]>;
}

// Supporting types
export interface PermissionRule {
  id?: string;
  name: string;
  description?: string;
  resourceType: string;
  action: string;
  conditions: PermissionCondition[];
  effect: 'allow' | 'deny';
  priority: number;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'greater' | 'less' | 'regex' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PermissionContext {
  user: User;
  resource?: {
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
  environment?: {
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
  request?: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
  };
}

export interface InheritedPermission {
  permission: Permission;
  source: 'role' | 'group' | 'direct' | 'rule';
  sourceId: string;
  sourceName: string;
}

export interface PermissionAuditEntry {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  userName: string;
  permission: Permission;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  result: boolean;
  reason?: string;
  timestamp: Date;
  context?: any;
}

export interface PermissionTemplate {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdBy: string;
}