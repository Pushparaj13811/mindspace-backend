# Granular Access Control Architecture - MindSpace

## Overview

This document outlines the comprehensive granular access control system implemented for MindSpace, providing role-based permissions with company management capabilities.

## Role Hierarchy

```
SUPER_ADMIN (Platform Level)
├── COMPANY_ADMIN (Organization Level)
│   ├── COMPANY_MANAGER (Department Level)
│   └── COMPANY_USER (Individual Level)
└── INDIVIDUAL_USER (No Company Association)
```

## Permissions System

### Platform Permissions (Super Admin Only)
- `manage_platform` - Full platform management
- `view_platform_analytics` - View platform-wide analytics
- `manage_companies` - Create, update, delete companies
- `manage_super_admins` - Manage other super admins

### Company Permissions
- `manage_company` - Update company settings and information
- `view_company_analytics` - View company-specific analytics
- `manage_company_users` - Invite, remove, and manage users
- `manage_departments` - Manage departments within company

### User Permissions
- `manage_profile` - Update own profile information
- `create_journal` - Create and manage journal entries
- `view_own_data` - Access own data and history
- `delete_account` - Delete own account
- `view_company_data` - View aggregated company data (for company users)

## Role Definitions

### SUPER_ADMIN
- **Purpose**: Platform administrators with full access
- **Capabilities**:
  - Manage all companies and users
  - View platform analytics
  - Access system-wide settings
  - Create other super admins
- **Use Case**: MindSpace platform administrators

### COMPANY_ADMIN
- **Purpose**: Organization administrators
- **Capabilities**:
  - Manage their company settings
  - Invite and manage company users
  - View company analytics
  - Assign roles within company
  - Access all company user data
- **Use Case**: HR managers, IT administrators

### COMPANY_MANAGER
- **Purpose**: Department or team managers
- **Capabilities**:
  - View company analytics
  - Manage their department
  - Limited user management
  - Access company data
- **Use Case**: Team leads, department managers

### COMPANY_USER
- **Purpose**: Regular company employees
- **Capabilities**:
  - Standard user features
  - View company-wide insights
  - Participate in company programs
- **Use Case**: Regular employees using company instance

### INDIVIDUAL_USER
- **Purpose**: Personal users not associated with any company
- **Capabilities**:
  - Standard personal features
  - No company data access
  - Personal subscription management
- **Use Case**: Individual consumers

## Company Management

### Company Structure
```typescript
interface Company {
  $id: string;
  name: string;
  domain: string; // For auto-assignment
  adminId: string;
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    dataRetentionDays: number;
  };
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    maxUsers: number;
    currentUsers: number;
  };
}
```

### Auto-Assignment
Users are automatically assigned to companies based on their email domain during registration:
- Check if email domain matches company domain
- Auto-assign role: `COMPANY_USER`
- Only if company allows self-registration

### User Invitation System
Companies can invite users via:
1. Generate invite token with role specification
2. Send invitation link/email
3. User accepts invite and creates account
4. Automatically assigned to company with specified role

## API Endpoints

### Company Management (Super Admin)
- `POST /api/v1/companies` - Create company
- `GET /api/v1/companies` - List all companies
- `DELETE /api/v1/companies/:id` - Delete company

### Company Operations
- `GET /api/v1/companies/:id` - Get company details
- `PATCH /api/v1/companies/:id` - Update company
- `POST /api/v1/companies/:id/invite` - Invite user
- `GET /api/v1/companies/:id/users` - List company users
- `PATCH /api/v1/companies/:id/users/:userId/role` - Update user role
- `DELETE /api/v1/companies/:id/users/:userId` - Remove user

### Analytics
- `GET /api/v1/companies/:id/analytics` - Company analytics
- `GET /api/v1/companies/platform/analytics` - Platform analytics (Super Admin)

### Public Endpoints
- `POST /api/v1/companies/invite/:token/accept` - Accept invitation

## Authentication & Authorization

### OAuth2 Fix
Fixed the OAuth2 scope issue by:
1. Using admin Users API instead of session-based API
2. Proper fallback mechanisms
3. JWT creation using admin privileges
4. Robust error handling

### Middleware Stack
1. `authMiddleware` - Validates tokens and extracts user
2. `requirePermission(permission)` - Checks specific permission
3. `requireRole(role)` - Checks specific role
4. `requireSuperAdmin` - Super admin only access
5. `requireCompanyAdmin` - Company admin or higher
6. `requireCompanyAccess` - Company access validation

### Rate Limiting
Enhanced rate limiting based on role and subscription:
```typescript
SUPER_ADMIN: 10,000 requests/15min
COMPANY_ADMIN: 2,000-5,000 requests/15min (tier-based)
COMPANY_MANAGER: 1,500-3,000 requests/15min (tier-based)
COMPANY_USER: 1,000-2,000 requests/15min (tier-based)
INDIVIDUAL_USER: 500-1,000 requests/15min (tier-based)
```

## Security Features

### Access Control
- Role-based permissions with strict validation
- Company isolation (users can only access their company data)
- Hierarchical access (higher roles can manage lower roles)
- Permission inheritance and role-specific capabilities

### Data Protection
- Company data isolation
- User data privacy within companies
- Audit logging for administrative actions
- Secure invite system with expiring tokens

## Database Collections

### Users Collection (Enhanced)
```typescript
{
  // ... existing fields
  role: UserRole;
  companyId?: string;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
}
```

### Companies Collection (New)
```typescript
{
  $id: string;
  name: string;
  domain: string;
  adminId: string;
  settings: CompanySettings;
  subscription: CompanySubscription;
  createdAt: string;
  updatedAt: string;
}
```

## Implementation Files

### Core Files
- `src/types/index.ts` - Type definitions
- `src/utils/permissions.ts` - Permission system
- `src/middleware/auth.ts` - Enhanced auth middleware

### Services
- `src/services/AppwriteCompanyService.ts` - Company management
- `src/services/AppwriteAuthService.ts` - Enhanced with company support

### Controllers & Routes
- `src/controllers/CompanyController.ts` - Company operations
- `src/routes/company.ts` - Company API routes

### Configuration
- `src/container/ServiceContainer.ts` - DI container updates
- `src/bootstrap.ts` - Service registration
- `src/utils/config.ts` - Configuration updates

## Usage Examples

### Creating a Company (Super Admin)
```typescript
POST /api/v1/companies
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "settings": {
    "allowSelfRegistration": true,
    "requireEmailVerification": true,
    "dataRetentionDays": 365
  }
}
```

### Inviting a User
```typescript
POST /api/v1/companies/company-id/invite
{
  "email": "user@acme.com",
  "role": "COMPANY_USER",
  "name": "John Doe"
}
```

### Checking Permissions
```typescript
import { hasPermission } from '../utils/permissions.js';

if (hasPermission(user, 'manage_company_users')) {
  // User can manage company users
}
```

## Migration Notes

### Existing Users
- All existing users will default to `INDIVIDUAL_USER` role
- Maintain backward compatibility with existing authentication
- Gradual migration path for existing companies

### Environment Variables
Add to `.env`:
```bash
COMPANIES_COLLECTION_ID=companies
```

## Testing Strategy

1. **Unit Tests**: Permission system logic
2. **Integration Tests**: Company management flows
3. **API Tests**: All endpoints with different roles
4. **Security Tests**: Access control validation
5. **Performance Tests**: Rate limiting and scaling

This architecture provides a comprehensive, secure, and scalable foundation for granular access control in MindSpace, supporting both individual users and enterprise organizations.