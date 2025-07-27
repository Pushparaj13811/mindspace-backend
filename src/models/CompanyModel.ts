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
 * Complete database schema for companies collection
 */
export const CompanySchema = {
  name: 'companies',
  permissions: ['read', 'write', 'create', 'update', 'delete'],
  attributes: [
    { key: 'name', type: 'string', size: 200, required: true },
    { key: 'domain', type: 'string', size: 100, required: true },
    { key: 'logo', type: 'string', size: 500, required: false },
    { key: 'adminId', type: 'string', size: 36, required: true },
    
    // Settings (flattened for Appwrite)
    { key: 'settingsAllowSelfRegistration', type: 'boolean', required: true },
    { key: 'settingsRequireEmailVerification', type: 'boolean', required: true },
    { key: 'settingsDataRetentionDays', type: 'integer', required: true, min: 30, max: 2555 },
    
    // Subscription (flattened for Appwrite)
    { key: 'subscriptionTier', type: 'string', size: 20, required: true },
    { key: 'subscriptionValidUntil', type: 'datetime', required: false },
    { key: 'subscriptionMaxUsers', type: 'integer', required: true, min: 1, max: 10000 },
    { key: 'subscriptionCurrentUsers', type: 'integer', required: true, min: 0 },
    
    // Company metadata
    { key: 'industry', type: 'string', size: 100, required: false },
    { key: 'size', type: 'string', size: 50, required: false },
    { key: 'country', type: 'string', size: 50, required: false },
    { key: 'timezone', type: 'string', size: 50, required: false },
    { key: 'website', type: 'string', size: 200, required: false },
    { key: 'phone', type: 'string', size: 20, required: false },
    { key: 'address', type: 'string', size: 500, required: false },
    
    // Feature flags
    { key: 'featuresAiInsights', type: 'boolean', required: true },
    { key: 'featuresAdvancedAnalytics', type: 'boolean', required: true },
    { key: 'featuresCustomBranding', type: 'boolean', required: true },
    { key: 'featuresApiAccess', type: 'boolean', required: true },
    { key: 'featuresSsoIntegration', type: 'boolean', required: true },
    
    // Status
    { key: 'isActive', type: 'boolean', required: true },
    { key: 'isVerified', type: 'boolean', required: true }
  ],
  indexes: [
    { key: 'domain_index', type: 'unique', attributes: ['domain'] },
    { key: 'admin_index', type: 'key', attributes: ['adminId'] },
    { key: 'name_index', type: 'key', attributes: ['name'] },
    { key: 'tier_index', type: 'key', attributes: ['subscriptionTier'] },
    { key: 'active_index', type: 'key', attributes: ['isActive'] },
    { key: 'verified_index', type: 'key', attributes: ['isVerified'] },
    { key: 'created_at_index', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] },
    { key: 'name_search', type: 'fulltext', attributes: ['name'] }
  ]
};