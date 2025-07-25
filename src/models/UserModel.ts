import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';

/**
 * User roles in the system
 */
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_MANAGER' | 'COMPANY_USER' | 'INDIVIDUAL_USER';

/**
 * User permissions
 */
export type Permission = 
  // Platform permissions
  'manage_platform' | 'view_platform_analytics' | 'manage_companies' | 'manage_super_admins' |
  // Company permissions  
  'manage_company' | 'view_company_analytics' | 'manage_company_users' | 'manage_departments' |
  // User permissions
  'manage_profile' | 'create_journal' | 'view_own_data' | 'delete_account' | 'view_company_data';

/**
 * User subscription tiers
 */
export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

/**
 * User model interface
 */
export interface UserModel extends BaseModel {
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  
  // Role and Company Association
  role: UserRole;
  companyId?: string;
  permissions: Permission[];
  
  // Subscription
  subscription: {
    tier: SubscriptionTier;
    validUntil?: string;
  };
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    preferredAIModel: string;
    language: string;
  };
  
  // Metadata
  lastLogin?: string;
  isActive: boolean;
}

/**
 * User creation input
 */
export type CreateUserInput = CreateInput<UserModel>;

/**
 * User update input
 */
export type UpdateUserInput = UpdateInput<UserModel>;

/**
 * Basic schema for database operations
 */
export const UserSchema = {
  name: 'users',
  permissions: ['read', 'write', 'create', 'update', 'delete']
};