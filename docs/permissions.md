# MindSpace Permission System

## Overview

MindSpace implements a sophisticated **multi-layered authorization system** that combines Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), and resource-specific permissions. This granular system ensures secure access to all platform features while maintaining flexibility for complex organizational structures.

## Table of Contents

- [Authorization Architecture](#authorization-architecture)
- [Role Hierarchy](#role-hierarchy)
- [Permission Categories](#permission-categories)
- [Permission Evaluation](#permission-evaluation)
- [Resource-Based Access Control](#resource-based-access-control)
- [Dynamic Permission Rules (ABAC)](#dynamic-permission-rules-abac)
- [Audit and Logging](#audit-and-logging)
- [API Usage Examples](#api-usage-examples)
- [Security Considerations](#security-considerations)

## Authorization Architecture

### Multi-Layer Permission System

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Evaluation                    │
├─────────────────────────────────────────────────────────────┤
│  1️⃣ User Active Check                                       │
│     ├─ Account Status (active/inactive)                    │
│     └─ Email Verification (context-dependent)              │
├─────────────────────────────────────────────────────────────┤
│  2️⃣ Role-Based Permissions (RBAC)                          │
│     ├─ Role Hierarchy Evaluation                           │
│     ├─ Inherited Role Permissions                          │
│     └─ Role-Specific Business Rules                        │
├─────────────────────────────────────────────────────────────┤
│  3️⃣ Direct Permission Assignment                           │
│     ├─ User-Specific Permissions                           │
│     ├─ Permission Addition/Revocation                      │
│     └─ Temporary Permission Grants                         │
├─────────────────────────────────────────────────────────────┤
│  4️⃣ Resource-Based Access Control                          │
│     ├─ Company Resource Isolation                          │
│     ├─ User Data Ownership                                 │
│     └─ Cross-Company Access Rules                          │
├─────────────────────────────────────────────────────────────┤
│  5️⃣ Dynamic Rules (ABAC)                                   │
│     ├─ Context-Aware Permissions                           │
│     ├─ Time-Based Access                                   │
│     └─ Environmental Conditions                            │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Permission Domain (`src/core/domain/Permission.ts`)
- **Static Permission Logic**: Role hierarchies, basic permission checks
- **Resource Access Rules**: Company isolation, user management rules
- **ABAC Rule Evaluation**: Dynamic permission evaluation engine

#### 2. Permission Service (`src/core/services/PermissionService.ts`)
- **Business Logic**: Permission assignment, role management
- **Database Integration**: Persistent permission storage
- **Audit Logging**: Complete permission check tracking

#### 3. Permission Guard (`src/core/middleware/PermissionGuard.ts`)
- **Route Protection**: Middleware for HTTP endpoint security
- **Method Decorators**: Annotation-based permission checking
- **Error Handling**: Standardized permission denial responses

## Role Hierarchy

### User Roles (Privilege Level: Low → High)

```
                    ┌─────────────────┐
                    │   SUPER_ADMIN   │ ← Platform Owner
                    │   Level: 5      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ COMPANY_ADMIN   │ ← Organization Owner
                    │   Level: 4      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │COMPANY_MANAGER  │ ← Department Head
                    │   Level: 3      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ COMPANY_USER    │ ← Employee
                    │   Level: 2      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │INDIVIDUAL_USER  │ ← Personal User
                    │   Level: 1      │
                    └─────────────────┘
```

#### Role Definitions

##### SUPER_ADMIN (Level 5)
- **Scope**: Entire platform
- **Purpose**: Platform management and oversight
- **Company Association**: None (platform-wide access)
- **Key Capabilities**:
  - Manage all companies and users
  - Access platform-wide analytics
  - Create and manage super admin accounts
  - Override any permission restriction
  - Access any company's data

##### COMPANY_ADMIN (Level 4)
- **Scope**: Single company/organization
- **Purpose**: Company management and administration
- **Company Association**: Required
- **Key Capabilities**:
  - Manage company settings and branding
  - Invite and manage all company users
  - Access company-wide analytics and reports
  - Create departments and assign managers
  - View and manage all company data

##### COMPANY_MANAGER (Level 3)
- **Scope**: Department/team within company
- **Purpose**: Team leadership and departmental management
- **Company Association**: Required
- **Key Capabilities**:
  - Manage assigned department/team
  - View team analytics and reports
  - Oversee team members' wellness data
  - Approve team-related requests
  - Limited company data access

##### COMPANY_USER (Level 2)
- **Scope**: Individual within company
- **Purpose**: Employee access to company wellness program
- **Company Association**: Required
- **Key Capabilities**:
  - Access company wellness features
  - Participate in company programs
  - View company-wide announcements
  - Basic team collaboration features
  - Personal data management

##### INDIVIDUAL_USER (Level 1)
- **Scope**: Personal use only
- **Purpose**: Individual wellness tracking and management
- **Company Association**: None
- **Key Capabilities**:
  - Personal journal and mood tracking
  - AI-powered insights for personal data
  - Individual progress tracking
  - Personal account management
  - No access to company features

## Permission Categories

### Platform Permissions
**Scope**: Platform-wide administrative functions

```typescript
// Platform Management
'manage_platform'           // Core platform settings and configuration
'view_platform_analytics'   // System-wide usage and performance metrics
'manage_companies'          // Create, update, delete company accounts
'manage_super_admins'       // Create and manage super administrator accounts
```

**Granted To**: `SUPER_ADMIN`

### Company Permissions
**Scope**: Organization-level operations and management

```typescript
// Organization Management
'manage_company'            // Company settings, branding, configuration
'view_company_analytics'    // Company-wide usage and wellness metrics
'manage_company_users'      // Invite, onboard, manage company employees
'manage_departments'        // Create departments, assign managers
'view_company_data'         // Access to company users' aggregated data
```

**Granted To**: `SUPER_ADMIN`, `COMPANY_ADMIN`, `COMPANY_MANAGER` (limited)

### User Permissions
**Scope**: Personal data and account management

```typescript
// Personal Management
'manage_profile'            // Update personal information and preferences
'create_journal'            // Create and manage journal entries
'view_own_data'            // Access personal wellness data and reports
'delete_account'           // Self-service account deletion
```

**Granted To**: All roles (self-management rights)

## Permission Evaluation

### Permission Resolution Order

1. **User Status Check**
   ```typescript
   if (!user.isActive) return false; // Inactive users have no permissions
   ```

2. **Direct Permission Check** (highest priority)
   ```typescript
   if (user.permissions && user.permissions.includes(permission)) {
     return true; // Explicit permission granted
   }
   ```

3. **Role-Based Permission Check** (inherited permissions)
   ```typescript
   const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
   return rolePermissions.includes(permission);
   ```

### Permission Inheritance Model

```typescript
interface User {
  role: UserRole;              // Primary role defining base permissions
  permissions: Permission[];   // Additional explicit permissions
  companyId?: string;         // Company association for resource access
  isActive: boolean;          // Account status gate
}

// Effective permissions = Role permissions + Direct permissions
function getEffectivePermissions(user: User): Permission[] {
  const rolePermissions = getRolePermissions(user.role);
  const directPermissions = user.permissions || [];
  return [...new Set([...rolePermissions, ...directPermissions])];
}
```

### Business Rules Implementation

#### Company Resource Access
```typescript
static canAccessCompany(user: User, companyId: string): boolean {
  if (!user.isActive) return false;
  
  // Super admin can access any company
  if (user.role === 'SUPER_ADMIN') return true;
  
  // Users can only access their own company
  return user.companyId === companyId;
}
```

#### User Management Authorization
```typescript
static canManageUser(manager: User, targetUser: User): boolean {
  if (!manager.isActive || !targetUser.isActive) return false;

  // Super admin can manage anyone
  if (manager.role === 'SUPER_ADMIN') return true;
  
  // Must be in same company for company roles
  if (manager.companyId !== targetUser.companyId) return false;
  
  // Company admin can manage anyone in their company (except super admins)
  if (manager.role === 'COMPANY_ADMIN' && targetUser.role !== 'SUPER_ADMIN') return true;
  
  // Company manager can manage company users only
  if (manager.role === 'COMPANY_MANAGER' && targetUser.role === 'COMPANY_USER') return true;
  
  return false;
}
```

#### Data Visibility Rules
```typescript
static canViewUserData(viewer: User, targetUser: User): boolean {
  // Users can always view their own data
  if (viewer.$id === targetUser.$id) return true;
  
  // Super admin can view anyone's data
  if (viewer.role === 'SUPER_ADMIN') return true;
  
  // Company admin/managers can view their company users' data
  if ((viewer.role === 'COMPANY_ADMIN' || viewer.role === 'COMPANY_MANAGER') && 
      viewer.companyId === targetUser.companyId &&
      hasPermission(viewer, 'view_company_data')) {
    return true;
  }
  
  return false;
}
```

## Resource-Based Access Control

### Resource Types and Access Patterns

#### Journal Resources
```typescript
async canAccessResource(user: User, resourceType: 'journal', resourceId: string, action: string): Promise<boolean> {
  const journal = await this.databaseService.read('journals', resourceId);
  
  // Users can access their own journals
  if (journal.userId === user.$id) return true;
  
  // Super admin can access any journal
  if (user.role === 'SUPER_ADMIN') return true;
  
  // Company admin can access company journals
  if (user.role === 'COMPANY_ADMIN' && user.companyId) {
    const journalOwner = await this.databaseService.read('users', journal.userId);
    return journalOwner.companyId === user.companyId;
  }
  
  return false;
}
```

#### Company Resources
- **Company Settings**: Only `COMPANY_ADMIN` and `SUPER_ADMIN`
- **Company Analytics**: `COMPANY_ADMIN`, `COMPANY_MANAGER` (limited), `SUPER_ADMIN`
- **Company User Data**: Based on role level and department assignment

#### User Profile Resources
- **Own Profile**: All users can manage their own profile
- **Other Profiles**: Based on management hierarchy and company association
- **Cross-Company Access**: Only `SUPER_ADMIN`

### Resource Isolation Strategies

#### Company Data Isolation
```typescript
// All company-scoped queries include company filter
const companyFilter = user.role === 'SUPER_ADMIN' 
  ? {} // Super admin sees all
  : { companyId: user.companyId }; // Others see only their company

const results = await database.list('journals', [
  ...otherFilters,
  ...companyFilter ? [companyFilter] : []
]);
```

#### User Data Privacy
```typescript
// Personal data visibility matrix
const canViewPersonalData = (viewer: User, targetUser: User) => {
  return viewer.$id === targetUser.$id || // Own data
         viewer.role === 'SUPER_ADMIN' || // Platform admin
         (viewer.companyId === targetUser.companyId && // Same company
          ['COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(viewer.role)); // And manager+
};
```

## Dynamic Permission Rules (ABAC)

### Rule Structure

```typescript
interface PermissionRule {
  id: string;
  name: string;                    // Human-readable rule name
  description?: string;            // Rule purpose and context
  resourceType: string;           // Target resource (user, journal, company)
  action: string;                 // Required action (view, edit, delete)
  conditions: PermissionCondition[]; // Evaluation criteria
  effect: 'allow' | 'deny';      // Grant or deny access
  priority: number;               // Rule precedence (higher = first)
  isActive: boolean;              // Enable/disable rule
}

interface PermissionCondition {
  field: string;                  // Field to evaluate (user.role, resource.status)
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 
            'contains' | 'not_contains' | 'greater' | 'less' | 
            'regex' | 'exists' | 'not_exists';
  value: any;                     // Comparison value
  logicalOperator?: 'AND' | 'OR'; // Combine with next condition
}
```

### Example Rules

#### Time-Based Access Rule
```typescript
const businessHoursRule: PermissionRule = {
  name: "Business Hours Journal Access",
  description: "Allow journal viewing only during business hours",
  resourceType: "journal",
  action: "view",
  conditions: [
    {
      field: "environment.timestamp.hour",
      operator: "greater",
      value: 8,
      logicalOperator: "AND"
    },
    {
      field: "environment.timestamp.hour", 
      operator: "less",
      value: 18
    }
  ],
  effect: "allow",
  priority: 100,
  isActive: true
};
```

#### Location-Based Rule
```typescript
const officeLocationRule: PermissionRule = {
  name: "Office Location Required",
  description: "Require office location for sensitive data access",
  resourceType: "user",
  action: "view_sensitive",
  conditions: [
    {
      field: "environment.location",
      operator: "in",
      value: ["office_building_1", "office_building_2"]
    }
  ],
  effect: "allow",
  priority: 200,
  isActive: true
};
```

### Rule Evaluation Context

```typescript
interface PermissionContext {
  user: User;                     // Current user context
  resource?: {                    // Target resource information
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
  environment?: {                 // Environmental context
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
  request?: {                     // HTTP request context
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
  };
}
```

### Rule Processing Engine

```typescript
static evaluateRule(rule: PermissionRule, context: PermissionContext): boolean {
  if (!rule.isActive) return false;

  // Evaluate all conditions
  const conditionResults = rule.conditions.map(condition => 
    this.evaluateCondition(condition, context)
  );

  // Apply logical operators (AND by default)
  let result = conditionResults[0] ?? false;
  for (let i = 1; i < rule.conditions.length; i++) {
    const condition = rule.conditions[i];
    const conditionResult = conditionResults[i];
    
    if (condition.logicalOperator === 'OR') {
      result = result || conditionResult;
    } else { // Default to AND
      result = result && conditionResult;
    }
  }

  // Apply rule effect
  return rule.effect === 'allow' ? result : !result;
}
```

## Audit and Logging

### Permission Audit Trail

All permission checks are logged for security auditing and compliance:

```typescript
interface PermissionAuditEntry {
  $id: string;                    // Unique audit entry ID
  $createdAt: string;            // Timestamp of permission check
  userId: string;                // User who attempted access
  userName: string;              // User's display name
  permission: Permission;        // Permission that was checked
  resourceType?: string;         // Type of resource accessed
  resourceId?: string;           // Specific resource ID
  action?: string;               // Action attempted
  result: boolean;               // Permission granted (true) or denied (false)
  reason?: string;               // Denial reason or grant source
  context?: any;                 // Additional context (JSON)
}
```

### Audit Log Categories

#### Permission Checks
```typescript
await this.logPermissionCheck(user.$id, 'view_company_data', true, {
  checkType: 'basic',
  userRole: user.role,
  resourceType: 'analytics',
  source: 'role_based'
});
```

#### Role Changes
```typescript
await this.logPermissionCheck(userId, 'manage_profile', true, {
  action: 'role_updated',
  oldRole: 'COMPANY_USER',
  newRole: 'COMPANY_MANAGER',
  updatedBy: adminUserId
});
```

#### Permission Assignments
```typescript
await this.logPermissionCheck(userId, 'view_company_data', true, {
  action: 'permissions_assigned',
  assignedPermissions: ['view_company_analytics', 'manage_departments'],
  assignedBy: adminUserId
});
```

### Security Monitoring

#### Failed Access Attempts
```typescript
// Automatically logged when permission checks fail
{
  userId: "user123",
  permission: "manage_company",
  result: false,
  reason: "Insufficient role: COMPANY_USER < COMPANY_ADMIN",
  context: {
    attemptedAction: "update_company_settings",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0..."
  }
}
```

#### Privilege Escalation Detection
```typescript
// Monitor for rapid role changes or unusual permission grants
{
  userId: "user456",
  action: "bulk_permissions_assigned", 
  permissions: ["manage_platform", "manage_companies"],
  assignedBy: "admin789",
  flags: ["privilege_escalation_detected", "admin_review_required"]
}
```

## API Usage Examples

### Basic Permission Checking

#### Controller Integration
```typescript
class JournalController extends BaseController {
  async getJournal(context: any) {
    const user = this.getCurrentUser(context);
    const { journalId } = context.params;
    
    // Check basic permission
    await this.requirePermission(user, 'view_own_data');
    
    // Check resource-specific access
    const canAccess = await this.services.permissionService.canAccessResource(
      user, 'journal', journalId, 'view'
    );
    
    if (!canAccess) {
      throw new Error('Access denied: Cannot view this journal');
    }
    
    // Proceed with business logic...
  }
}
```

#### Middleware Usage
```typescript
// Route-level permission guard
app.get('/api/v1/company/:id/analytics', 
  authMiddleware().requireAuth(),
  async (context) => {
    const user = context.user;
    const { id: companyId } = context.params;
    
    // Verify company access
    await permissionGuard.requireCompanyAccess(user, companyId);
    
    // Verify analytics permission
    await permissionGuard.requirePermission(user, 'view_company_analytics');
    
    // Return analytics data...
  }
);
```

### Advanced Permission Patterns

#### Multi-Permission Checks
```typescript
// Require ANY of the specified permissions
await permissionGuard.requireAnyPermission(user, [
  'manage_company_users',
  'manage_departments'
]);

// Require ALL of the specified permissions
await permissionGuard.requireAllPermissions(user, [
  'view_company_data',
  'view_company_analytics'
]);
```

#### Resource Ownership Patterns
```typescript
// Allow resource owner OR administrator access
await permissionGuard.requireOwnerOrAdmin(user, resourceOwnerId);

// Require users to be in the same company
await permissionGuard.requireSameCompanyAccess(user, targetUser);
```

#### Subscription-Based Access
```typescript
// Require premium subscription for advanced features
await permissionGuard.requireSubscriptionTier(user, 'premium');

// Combined checks for premium features
await permissionGuard.requireActiveUserWithPermission(user, 'create_journal');
await permissionGuard.requireSubscriptionTier(user, 'premium');
```

### Bulk Operations

#### Role Assignment
```typescript
// Bulk assign roles to multiple users
await permissionService.bulkAssignRole(
  ['user1', 'user2', 'user3'],
  'COMPANY_MANAGER',
  adminUserId
);
```

#### Permission Templates
```typescript
// Create permission template for new managers
const templateId = await permissionService.createPermissionTemplate(
  'Department Manager',
  ['view_company_analytics', 'manage_departments'],
  adminUserId
);

// Apply template to user
await permissionService.applyPermissionTemplate(
  newManagerId,
  templateId,
  adminUserId
);
```

## Security Considerations

### Security Best Practices

#### 1. Principle of Least Privilege
- Users receive minimum permissions necessary for their role
- Regular permission audits and cleanup
- Time-limited permission grants where appropriate

#### 2. Defense in Depth
- Multiple permission layers (role + resource + context)
- Database-level access controls
- Application-level permission checks
- Audit logging for all access attempts

#### 3. Permission Inheritance Security
```typescript
// Safe permission inheritance - explicit over implicit
function getEffectivePermissions(user: User): Permission[] {
  const basePermissions = getRolePermissions(user.role);
  const additionalPermissions = user.permissions || [];
  
  // Validate all permissions are legitimate
  const validPermissions = [...basePermissions, ...additionalPermissions]
    .filter(p => isValidPermission(p));
    
  return [...new Set(validPermissions)]; // Remove duplicates
}
```

#### 4. Context Validation
```typescript
// Always validate permission context
async evaluatePermission(user: User, permission: Permission, context: any) {
  // Validate user is active
  if (!user.isActive) return false;
  
  // Validate permission request context
  if (!isValidContext(context)) return false;
  
  // Check for permission context manipulation
  if (hasSuspiciousContext(context)) {
    await logSecurityIncident('context_manipulation', user, context);
    return false;
  }
  
  return await performPermissionCheck(user, permission, context);
}
```

### Common Security Anti-Patterns to Avoid

#### ❌ Client-Side Permission Enforcement
```typescript
// WRONG - Never rely on client-side permission checks
if (user.role === 'ADMIN') {
  return await adminOnlyOperation();
}
```

#### ✅ Server-Side Validation
```typescript
// CORRECT - Always validate on server
async adminOnlyOperation(user: User) {
  await this.requireRole(user, 'SUPER_ADMIN');
  // Proceed with operation...
}
```

#### ❌ Permission Check Bypassing
```typescript
// WRONG - Conditional permission checks
if (isDevelopment) {
  return await sensitiveOperation(); // Bypass in dev
}
await this.requirePermission(user, 'manage_platform');
```

#### ✅ Consistent Permission Enforcement
```typescript
// CORRECT - Always enforce permissions
async sensitiveOperation(user: User) {
  await this.requirePermission(user, 'manage_platform');
  // Always check permissions regardless of environment
}
```

### Threat Mitigation

#### Permission Escalation Prevention
- Role change validation through proper authorization chains
- Audit logging for all permission modifications
- Regular review of high-privilege accounts

#### Data Isolation Enforcement
- Company-scoped data access controls
- Cross-company access restricted to super admins
- Resource ownership validation

#### Session Security
- Permission checks on every request
- No client-side permission caching
- Token-based authentication with permission context

---

**Related Documentation**:
- [Architecture Overview](./architecture.md) - System design and patterns
- [Service Layer](./services.md) - Permission service implementation
- [API Reference](./api-reference.md) - Permission-protected endpoints
- [Configuration Guide](./config.md) - Permission system configuration