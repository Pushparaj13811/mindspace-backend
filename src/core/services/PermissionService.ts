import type { IPermissionService, PermissionRule, PermissionContext, PermissionAuditEntry, PermissionTemplate, InheritedPermission } from '../interfaces/IPermissionService.js';
import type { IDatabaseService } from '../interfaces/IDatabaseService.js';
import type { User, Permission, UserRole } from '../../types/index.js';
import { Permission as PermissionDomain } from '../domain/Permission.js';

/**
 * Permission service implementation
 * Handles all permission-related business logic
 */
export class PermissionService implements IPermissionService {
  constructor(
    private databaseService: IDatabaseService
  ) {}

  // Basic permission checking
  async hasPermission(user: User, permission: Permission): Promise<boolean> {
    const result = PermissionDomain.hasPermission(user, permission);
    
    // Log the permission check for audit purposes
    await this.logPermissionCheck(user.$id, permission, result, { 
      checkType: 'basic',
      userRole: user.role,
      userCompany: user.companyId 
    });
    
    return result;
  }

  async hasAnyPermission(user: User, permissions: Permission[]): Promise<boolean> {
    const result = PermissionDomain.hasAnyPermission(user, permissions);
    
    await this.logPermissionCheck(user.$id, ((permissions[0] || 'unknown') as Permission) as Permission, result, {
      checkType: 'any',
      permissions: permissions,
      userRole: user.role
    });
    
    return result;
  }

  async hasAllPermissions(user: User, permissions: Permission[]): Promise<boolean> {
    const result = PermissionDomain.hasAllPermissions(user, permissions);
    
    await this.logPermissionCheck(user.$id, ((permissions[0] || 'unknown') as Permission) as Permission, result, {
      checkType: 'all',
      permissions: permissions,
      userRole: user.role
    });
    
    return result;
  }

  // Resource-based permissions
  async canAccessResource(user: User, resourceType: string, resourceId: string, action: string): Promise<boolean> {
    // Basic resource access rules
    switch (resourceType) {
      case 'company':
        return PermissionDomain.canAccessCompany(user, resourceId);
      
      case 'user':
        const targetUser = await this.databaseService.read<User>('users', resourceId);
        if (action === 'view') {
          return PermissionDomain.canViewUserData(user, targetUser);
        } else if (action === 'manage') {
          return PermissionDomain.canManageUser(user, targetUser);
        }
        break;
      
      case 'journal':
        const journal = await this.databaseService.read<any>('journals', resourceId);
        // Users can access their own journals, company admins can access company journals
        if (journal.userId === user.$id) return true;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'COMPANY_ADMIN' && user.companyId) {
          const journalOwner = await this.databaseService.read<User>('users', journal.userId);
          return journalOwner.companyId === user.companyId;
        }
        return false;
      
      default:
        return false;
    }
    
    return false;
  }

  async canManageUser(manager: User, targetUserId: string): Promise<boolean> {
    const targetUser = await this.databaseService.read<User>('users', targetUserId);
    return PermissionDomain.canManageUser(manager, targetUser);
  }

  async canViewUserData(viewer: User, targetUserId: string): Promise<boolean> {
    const targetUser = await this.databaseService.read<User>('users', targetUserId);
    return PermissionDomain.canViewUserData(viewer, targetUser);
  }

  async canAccessCompany(user: User, companyId: string): Promise<boolean> {
    return PermissionDomain.canAccessCompany(user, companyId);
  }

  // Role management
  async getUserRole(userId: string): Promise<UserRole> {
    const user = await this.databaseService.read<User>('users', userId);
    return user.role;
  }

  async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<void> {
    const user = await this.databaseService.read<User>('users', userId);
    const updater = await this.databaseService.read<User>('users', updatedBy);
    
    // Validate permission to assign role
    if (!PermissionDomain.canAssignRole(updater, newRole, user.companyId)) {
      throw new Error('Insufficient permissions to assign this role');
    }
    
    // Update user role and permissions
    const newPermissions = PermissionDomain.getRolePermissions(newRole);
    await this.databaseService.update<User>('users', userId, {
      role: newRole,
      permissions: newPermissions,
      updatedAt: new Date().toISOString()
    });
    
    // Log the role change
    await this.logPermissionCheck(userId, 'manage_profile', true, {
      action: 'role_updated',
      oldRole: user.role,
      newRole: newRole,
      updatedBy: updatedBy
    });
  }

  getRolePermissions(role: UserRole): Permission[] {
    return PermissionDomain.getRolePermissions(role);
  }

  // Permission assignment
  async assignPermissions(userId: string, permissions: Permission[], assignedBy: string): Promise<void> {
    const user = await this.databaseService.read<User>('users', userId);
    const assigner = await this.databaseService.read<User>('users', assignedBy);
    
    // Validate assigner has permission to assign these permissions
    if (!PermissionDomain.hasPermission(assigner, 'manage_company_users') && 
        !PermissionDomain.hasPermission(assigner, 'manage_platform')) {
      throw new Error('Insufficient permissions to assign permissions');
    }
    
    const currentPermissions = user.permissions || [];
    const newPermissions = Array.from(new Set([...currentPermissions, ...permissions]));
    
    await this.databaseService.update<User>('users', userId, {
      permissions: newPermissions,
      updatedAt: new Date().toISOString()
    });
    
    // Log permission assignment
    await this.logPermissionCheck(userId, (permissions[0] || 'unknown') as Permission, true, {
      action: 'permissions_assigned',
      assignedPermissions: permissions,
      assignedBy: assignedBy
    });
  }

  async revokePermissions(userId: string, permissions: Permission[], revokedBy: string): Promise<void> {
    const user = await this.databaseService.read<User>('users', userId);
    const revoker = await this.databaseService.read<User>('users', revokedBy);
    
    // Validate revoker has permission
    if (!PermissionDomain.hasPermission(revoker, 'manage_company_users') && 
        !PermissionDomain.hasPermission(revoker, 'manage_platform')) {
      throw new Error('Insufficient permissions to revoke permissions');
    }
    
    const currentPermissions = user.permissions || [];
    const newPermissions = currentPermissions.filter(p => !permissions.includes(p));
    
    await this.databaseService.update<User>('users', userId, {
      permissions: newPermissions,
      updatedAt: new Date().toISOString()
    });
    
    // Log permission revocation
    await this.logPermissionCheck(userId, (permissions[0] || 'unknown') as Permission, true, {
      action: 'permissions_revoked',
      revokedPermissions: permissions,
      revokedBy: revokedBy
    });
  }

  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const user = await this.databaseService.read<User>('users', userId);
    return PermissionDomain.getEffectivePermissions(user);
  }

  // Dynamic permission rules (ABAC support)
  async evaluateRule(rule: PermissionRule, context: PermissionContext): Promise<boolean> {
    return PermissionDomain.evaluateRule(rule, context);
  }

  async createRule(rule: PermissionRule, createdBy: string): Promise<string> {
    const creator = await this.databaseService.read<User>('users', createdBy);
    
    if (!PermissionDomain.hasPermission(creator, 'manage_platform')) {
      throw new Error('Insufficient permissions to create permission rules');
    }
    
    const ruleData = {
      ...rule,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const createdRule = await this.databaseService.create<PermissionRule>('permission_rules', ruleData);
    return createdRule.id!;
  }

  async updateRule(ruleId: string, rule: PermissionRule, updatedBy: string): Promise<void> {
    const updater = await this.databaseService.read<User>('users', updatedBy);
    
    if (!PermissionDomain.hasPermission(updater, 'manage_platform')) {
      throw new Error('Insufficient permissions to update permission rules');
    }
    
    await this.databaseService.update<PermissionRule>('permission_rules', ruleId, {
      ...rule,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteRule(ruleId: string, deletedBy: string): Promise<void> {
    const deleter = await this.databaseService.read<User>('users', deletedBy);
    
    if (!PermissionDomain.hasPermission(deleter, 'manage_platform')) {
      throw new Error('Insufficient permissions to delete permission rules');
    }
    
    await this.databaseService.delete('permission_rules', ruleId);
  }

  async listRules(filters?: { resourceType?: string; action?: string }): Promise<PermissionRule[]> {
    const queries = [];
    if (filters?.resourceType) {
      queries.push({ field: 'resourceType', operator: 'equal' as const, value: filters.resourceType });
    }
    if (filters?.action) {
      queries.push({ field: 'action', operator: 'equal' as const, value: filters.action });
    }
    
    const result = await this.databaseService.list<PermissionRule>('permission_rules', queries);
    return result.documents;
  }

  // Permission inheritance
  async getInheritedPermissions(userId: string): Promise<InheritedPermission[]> {
    const user = await this.databaseService.read<User>('users', userId);
    const inherited: InheritedPermission[] = [];
    
    // Role-based permissions
    const rolePermissions = PermissionDomain.getRolePermissions(user.role);
    rolePermissions.forEach(permission => {
      inherited.push({
        permission,
        source: 'role',
        sourceId: user.role,
        sourceName: user.role.replace('_', ' ').toLowerCase()
      });
    });
    
    // Direct permissions
    if (user.permissions) {
      user.permissions.forEach(permission => {
        inherited.push({
          permission,
          source: 'direct',
          sourceId: user.$id,
          sourceName: 'Direct Assignment'
        });
      });
    }
    
    return inherited;
  }

  // Audit and logging
  async logPermissionCheck(userId: string, permission: Permission, result: boolean, context?: any): Promise<void> {
    try {
      const auditEntry: Omit<PermissionAuditEntry, '$id' | '$createdAt' | '$updatedAt'> = {
        userId,
        userName: '', // Will be populated by database trigger or separate query
        permission,
        result,
        timestamp: new Date(),
        context: context ? JSON.stringify(context) : undefined
      };
      
      await this.databaseService.create<PermissionAuditEntry>('permission_audit', auditEntry);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log permission check:', error);
    }
  }

  async getPermissionAuditLog(userId?: string, startDate?: Date, endDate?: Date): Promise<PermissionAuditEntry[]> {
    const queries = [];
    
    if (userId) {
      queries.push({ field: 'userId', operator: 'equal' as const, value: userId });
    }
    if (startDate) {
      queries.push({ field: 'timestamp', operator: 'greaterEqual' as const, value: startDate.toISOString() });
    }
    if (endDate) {
      queries.push({ field: 'timestamp', operator: 'lessEqual' as const, value: endDate.toISOString() });
    }
    
    const result = await this.databaseService.list<PermissionAuditEntry>('permission_audit', queries);
    return result.documents;
  }

  // Bulk operations
  async bulkAssignRole(userIds: string[], role: UserRole, assignedBy: string): Promise<void> {
    const assigner = await this.databaseService.read<User>('users', assignedBy);
    
    if (!PermissionDomain.canAssignRole(assigner, role)) {
      throw new Error('Insufficient permissions to assign this role');
    }
    
    const updates = userIds.map(userId => ({
      documentId: userId,
      data: {
        role,
        permissions: PermissionDomain.getRolePermissions(role),
        updatedAt: new Date().toISOString()
      }
    }));
    
    await this.databaseService.batchUpdate<User>('users', updates);
    
    // Log bulk role assignment
    for (const userId of userIds) {
      await this.logPermissionCheck(userId, 'manage_profile', true, {
        action: 'bulk_role_assigned',
        newRole: role,
        assignedBy: assignedBy
      });
    }
  }

  async bulkAssignPermissions(userIds: string[], permissions: Permission[], assignedBy: string): Promise<void> {
    const assigner = await this.databaseService.read<User>('users', assignedBy);
    
    if (!PermissionDomain.hasPermission(assigner, 'manage_company_users') && 
        !PermissionDomain.hasPermission(assigner, 'manage_platform')) {
      throw new Error('Insufficient permissions to assign permissions');
    }
    
    // Get current users to merge permissions
    const users = await Promise.all(
      userIds.map(id => this.databaseService.read<User>('users', id))
    );
    
    const updates = users.map(user => ({
      documentId: user.$id,
      data: {
        permissions: Array.from(new Set([...(user.permissions || []), ...permissions])),
        updatedAt: new Date().toISOString()
      }
    }));
    
    await this.databaseService.batchUpdate<User>('users', updates);
    
    // Log bulk permission assignment
    for (const userId of userIds) {
      await this.logPermissionCheck(userId, (permissions[0] || 'unknown') as Permission, true, {
        action: 'bulk_permissions_assigned',
        assignedPermissions: permissions,
        assignedBy: assignedBy
      });
    }
  }

  // Permission presets/templates
  async createPermissionTemplate(name: string, permissions: Permission[], createdBy: string): Promise<string> {
    const creator = await this.databaseService.read<User>('users', createdBy);
    
    if (!PermissionDomain.hasPermission(creator, 'manage_platform')) {
      throw new Error('Insufficient permissions to create permission templates');
    }
    
    const template: Omit<PermissionTemplate, '$id' | '$createdAt' | '$updatedAt'> = {
      name,
      permissions,
      createdBy
    };
    
    const created = await this.databaseService.create<PermissionTemplate>('permission_templates', template);
    return created.$id;
  }

  async applyPermissionTemplate(userId: string, templateId: string, appliedBy: string): Promise<void> {
    const applier = await this.databaseService.read<User>('users', appliedBy);
    const template = await this.databaseService.read<PermissionTemplate>('permission_templates', templateId);
    
    if (!PermissionDomain.hasPermission(applier, 'manage_company_users') && 
        !PermissionDomain.hasPermission(applier, 'manage_platform')) {
      throw new Error('Insufficient permissions to apply permission templates');
    }
    
    await this.assignPermissions(userId, template.permissions, appliedBy);
  }

  async listPermissionTemplates(): Promise<PermissionTemplate[]> {
    const result = await this.databaseService.list<PermissionTemplate>('permission_templates');
    return result.documents;
  }
}