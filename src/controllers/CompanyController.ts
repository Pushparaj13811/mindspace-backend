import { BaseController } from './BaseController.js';
import { HTTP_STATUS } from '../utils/response.js';
import { 
  createCompanySchema,
  updateCompanySchema,
  inviteUserSchema,
  acceptInviteSchema,
  updateUserRoleSchema,
  companyIdParamSchema
} from '../utils/validation.js';
import type { User, Company } from '../types/index.js';

/**
 * Company Controller - Handles company management operations
 * Follows clean architecture with dependency injection
 */
export class CompanyController extends BaseController {
  
  /**
   * Create a new company (Super admin only)
   */
  async createCompany(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      await this.requirePermission(user, 'manage_companies');
      
      this.logAction('create_company_attempt', user);
      
      const validatedData = this.validateRequestBody(createCompanySchema, body);
      
      const companyData = {
        name: validatedData.name,
        domain: validatedData.domain || validatedData.name.toLowerCase().replace(/\s+/g, '') + '.com',
        adminId: user.$id,
        settings: {
          allowSelfRegistration: validatedData.settings?.allowSelfRegistration ?? true,
          requireEmailVerification: validatedData.settings?.requireEmailVerification ?? true,
          dataRetentionDays: validatedData.settings?.dataRetentionDays ?? 365
        },
        subscription: {
          tier: 'free' as const,
          maxUsers: 50,
          currentUsers: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const company = await this.services.databaseService.create<Company>('companies', companyData);
      
      this.logAction('create_company_success', user, { companyId: company.$id });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success({ company }, 'Company created successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * List all companies (Super admin only)
   */
  async listCompanies(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      await this.requirePermission(user, 'manage_companies');
      
      const { page = 1, limit = 20 } = query;
      
      // Build database queries for listing companies
      const queries = [
        { field: '$createdAt', operator: 'greater' as const, value: '2020-01-01T00:00:00.000Z' } // Basic filter
      ];
      
      const result = await this.services.databaseService.list<Company>('companies', queries);
      
      return this.success(result, 'Companies retrieved successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get single company details
   */
  async getCompany(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.checkCompanyAccess(user, companyId);
      
      const company = await this.services.databaseService.read<Company>('companies', companyId);
      
      return this.success({ company }, 'Company retrieved successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update company details
   */
  async updateCompany(context: any) {
    const { params, body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.checkCompanyAccess(user, companyId);
      await this.requirePermission(user, 'manage_company');
      
      const validatedData = this.validateRequestBody(updateCompanySchema, body);
      
      const updateData: Partial<Company> = {
        name: validatedData.name,
        domain: validatedData.domain,
        logo: validatedData.logo,
        updatedAt: new Date().toISOString()
      };
      
      // Only include settings if provided and ensure all properties are defined
      if (validatedData.settings) {
        updateData.settings = {
          allowSelfRegistration: validatedData.settings.allowSelfRegistration ?? true,
          requireEmailVerification: validatedData.settings.requireEmailVerification ?? true,
          dataRetentionDays: validatedData.settings.dataRetentionDays ?? 365
        };
      }
      
      const company = await this.services.databaseService.update<Company>('companies', companyId, updateData);
      
      this.logAction('update_company_success', user, { companyId });
      
      return this.success({ company }, 'Company updated successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete company (Super admin only)
   */
  async deleteCompany(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.requirePermission(user, 'manage_companies');
      
      this.logAction('delete_company_attempt', user, { companyId });
      
      await this.services.databaseService.delete('companies', companyId);
      
      this.logAction('delete_company_success', user, { companyId });
      
      return this.success({ message: 'Company deleted successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Invite user to company
   */
  async inviteUser(context: any) {
    const { params, body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.checkCompanyAccess(user, companyId);
      await this.requirePermission(user, 'manage_company_users');
      
      const validatedData = this.validateRequestBody(inviteUserSchema, body);
      
      // TODO: Implement invite logic when EmailService is ready
      this.logAction('invite_user_attempt', user, { companyId, email: validatedData.email });
      
      return this.success({ message: 'User invited successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get company users
   */
  async getCompanyUsers(context: any) {
    const { params, query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.checkCompanyAccess(user, companyId);
      
      const { page = 1, limit = 20 } = query;
      
      // Build database queries for company users
      const queries = [
        { field: 'companyId', operator: 'equal' as const, value: companyId }
      ];
      
      const result = await this.services.databaseService.list<User>('users', queries);
      
      return this.success(result, 'Company users retrieved successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user role within company
   */
  async updateUserRole(context: any) {
    const { params, body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId, userId } = params;
      
      await this.checkCompanyAccess(user, companyId);
      await this.requirePermission(user, 'manage_company_users');
      
      const validatedData = this.validateRequestBody(updateUserRoleSchema, body);
      
      const updateData = {
        role: validatedData.role,
        updatedAt: new Date().toISOString()
      };
      
      const updatedUser = await this.services.databaseService.update<User>('users', userId, updateData);
      
      this.logAction('update_user_role_success', user, { companyId, userId, newRole: validatedData.role });
      
      return this.success({ user: updatedUser }, 'User role updated successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Remove user from company
   */
  async removeUser(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId, userId } = params;
      
      await this.checkCompanyAccess(user, companyId);
      await this.requirePermission(user, 'manage_company_users');
      
      const updateData = {
        companyId: undefined,
        role: 'INDIVIDUAL_USER' as const,
        updatedAt: new Date().toISOString()
      };
      
      await this.services.databaseService.update<User>('users', userId, updateData);
      
      this.logAction('remove_user_success', user, { companyId, userId });
      
      return this.success({ message: 'User removed from company successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get company analytics
   */
  async getCompanyAnalytics(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      const { companyId } = this.validateQueryParams(companyIdParamSchema, params);
      
      await this.checkCompanyAccess(user, companyId);
      await this.requirePermission(user, 'view_company_analytics');
      
      // TODO: Implement analytics when AnalyticsService is ready
      const analytics = {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        journalEntries: 0,
        moodLogs: 0
      };
      
      return this.success({ analytics }, 'Company analytics retrieved successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get platform-wide analytics (Super admin only)
   */
  async getPlatformAnalytics(context: any) {
    const { set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      await this.requirePermission(user, 'view_platform_analytics');
      
      // TODO: Implement platform analytics when AnalyticsService is ready
      const analytics = {
        totalUsers: 0,
        totalCompanies: 0,
        activeCompanies: 0,
        subscriptionDistribution: { free: 0, premium: 0, enterprise: 0 }
      };
      
      return this.success({ analytics }, 'Platform analytics retrieved successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Accept company invitation
   */
  async acceptInvite(context: any) {
    const { params, body, set } = context;
    
    try {
      const { inviteToken } = params;
      const validatedData = this.validateRequestBody(acceptInviteSchema, body);
      
      // TODO: Implement invite acceptance when InviteService is ready
      this.logAction('accept_invite_attempt', undefined, { inviteToken });
      
      return this.success({ message: 'Invitation accepted successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Helper method to check if user can access company
   */
  protected async checkCompanyAccess(user: User, companyId: string): Promise<void> {
    if (user.role === 'SUPER_ADMIN') {
      return; // Super admin can access all companies
    }
    
    if (user.companyId !== companyId) {
      throw new Error('You do not have access to this company');
    }
  }
}