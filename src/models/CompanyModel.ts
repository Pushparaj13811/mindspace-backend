import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';
import type { SubscriptionTier } from './UserModel.js';

/**
 * Company model interface
 */
export interface CompanyModel extends BaseModel {
  name: string;
  domain: string;
  logo?: string;
  adminId: string;
  
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    dataRetentionDays: number;
  };
  
  subscription: {
    tier: SubscriptionTier;
    validUntil?: string;
    maxUsers: number;
    currentUsers: number;
  };
}

/**
 * Company creation input
 */
export type CreateCompanyInput = CreateInput<CompanyModel>;

/**
 * Company update input
 */
export type UpdateCompanyInput = UpdateInput<CompanyModel>;

/**
 * Basic schema for database operations
 */
export const CompanySchema = {
  name: 'companies',
  permissions: ['read', 'write', 'create', 'update', 'delete']
};