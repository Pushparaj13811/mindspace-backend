import { BaseController } from './BaseController.js';
import type { ICompanyService } from '../interfaces/ICompanyService.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import { hasPermission, canAccessCompany, canManageUser } from '../utils/permissions.js';
import { z } from 'zod';

// Validation schemas
const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().email().transform(val => val.split('@')[1]),
  settings: z.object({
    allowSelfRegistration: z.boolean().optional(),
    requireEmailVerification: z.boolean().optional(),
    dataRetentionDays: z.number().min(30).max(2555).optional(), // ~7 years max
  }).optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().email().transform(val => val.split('@')[1]).optional(),
  logo: z.string().url().optional(),
  settings: z.object({
    allowSelfRegistration: z.boolean().optional(),
    requireEmailVerification: z.boolean().optional(),
    dataRetentionDays: z.number().min(30).max(2555).optional(),
  }).optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER']),
  name: z.string().min(2).max(100).optional(),
});

const acceptInviteSchema = z.object({
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER']),
});

export class CompanyController extends BaseController {
  
  /**
   * Create a new company (Super admin only)
   */
  async createCompany(context: { user?: any; body: unknown; set: any }) {
    const { user, body, set } = context;
    
    try {
      // Check authentication and permissions
      const { user: authUser } = this.requireAuth(user, null, set);
      
      if (!hasPermission(authUser, 'manage_companies')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to create companies', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('create_company_attempt', authUser.$id);
      
      // Validate request body
      const validatedData = this.validateRequestBody(createCompanySchema, body);
      
      // Create company through service
      const companyService = this.services.companyService as ICompanyService;
      const company = await companyService.createCompany(validatedData, authUser.$id);
      
      this.logAction('create_company_success', authUser.$id, { companyId: company.$id });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { company },
        'Company created successfully',
        HTTP_STATUS.CREATED
      );
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update company information
   */
  async updateCompany(context: { user?: any; params: any; body: unknown; set: any }) {
    const { user, params, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'manage_company')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to update this company', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('update_company_attempt', authUser.$id, { companyId });
      
      const validatedData = this.validateRequestBody(updateCompanySchema, body);
      
      const companyService = this.services.companyService as ICompanyService;
      const company = await companyService.updateCompany(companyId, validatedData);
      
      this.logAction('update_company_success', authUser.$id, { companyId });
      
      return this.success({ company }, 'Company updated successfully');
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete company (Super admin only)
   */
  async deleteCompany(context: { user?: any; params: any; set: any }) {
    const { user, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!hasPermission(authUser, 'manage_companies')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to delete companies', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('delete_company_attempt', authUser.$id, { companyId });
      
      const companyService = this.services.companyService as ICompanyService;
      await companyService.deleteCompany(companyId);
      
      this.logAction('delete_company_success', authUser.$id, { companyId });
      
      return this.success({ message: 'Company deleted successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get company information
   */
  async getCompany(context: { user?: any; params: any; set: any }) {
    const { user, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!canAccessCompany(authUser, companyId)) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have access to this company', HTTP_STATUS.FORBIDDEN);
      }
      
      const companyService = this.services.companyService as ICompanyService;
      const company = await companyService.getCompany(companyId);
      
      if (!company) {
        set.status = HTTP_STATUS.NOT_FOUND;
        return this.error('Company not found', HTTP_STATUS.NOT_FOUND);
      }
      
      return this.success({ company });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * List all companies (Super admin only)
   */
  async listCompanies(context: { user?: any; query: any; set: any }) {
    const { user, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      
      if (!hasPermission(authUser, 'manage_companies')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to list companies', HTTP_STATUS.FORBIDDEN);
      }
      
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      
      const companyService = this.services.companyService as ICompanyService;
      const result = await companyService.listCompanies(page, limit);
      
      return this.success({
        companies: result.companies,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Invite user to company
   */
  async inviteUser(context: { user?: any; params: any; body: unknown; set: any }) {
    const { user, params, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'manage_company_users')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to invite users', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('invite_user_attempt', authUser.$id, { companyId });
      
      const validatedData = this.validateRequestBody(inviteUserSchema, body);
      
      const companyService = this.services.companyService as ICompanyService;
      const invite = await companyService.inviteUser(companyId, validatedData);
      
      this.logAction('invite_user_success', authUser.$id, { 
        companyId, 
        email: validatedData.email,
        role: validatedData.role
      });
      
      return this.success({
        inviteId: invite.inviteId,
        inviteUrl: invite.inviteUrl,
        message: 'User invited successfully'
      });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Accept company invitation
   */
  async acceptInvite(context: { params: any; body: unknown; set: any }) {
    const { params, body, set } = context;
    
    try {
      const { inviteToken } = params;
      
      this.logAction('accept_invite_attempt', undefined, { inviteToken });
      
      const validatedData = this.validateRequestBody(acceptInviteSchema, body);
      
      const companyService = this.services.companyService as ICompanyService;
      const result = await companyService.acceptInvite(inviteToken, validatedData);
      
      this.logAction('accept_invite_success', result.user.$id, { 
        companyId: result.company.$id,
        role: result.user.role
      });
      
      return this.success({
        user: result.user,
        company: result.company,
        message: 'Invite accepted successfully'
      });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get company users
   */
  async getCompanyUsers(context: { user?: any; params: any; query: any; set: any }) {
    const { user, params, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'view_company_data')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have access to this company data', HTTP_STATUS.FORBIDDEN);
      }
      
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      
      const companyService = this.services.companyService as ICompanyService;
      const result = await companyService.getCompanyUsers(companyId, page, limit);
      
      return this.success({
        users: result.users,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user role in company
   */
  async updateUserRole(context: { user?: any; params: any; body: unknown; set: any }) {
    const { user, params, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId, userId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'manage_company_users')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to manage users', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('update_user_role_attempt', authUser.$id, { companyId, userId });
      
      const validatedData = this.validateRequestBody(updateUserRoleSchema, body);
      
      const companyService = this.services.companyService as ICompanyService;
      const updatedUser = await companyService.updateUserRole(companyId, userId, validatedData.role);
      
      this.logAction('update_user_role_success', authUser.$id, { 
        companyId, 
        userId,
        newRole: validatedData.role
      });
      
      return this.success({
        user: updatedUser,
        message: 'User role updated successfully'
      });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Remove user from company
   */
  async removeUser(context: { user?: any; params: any; set: any }) {
    const { user, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId, userId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'manage_company_users')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to manage users', HTTP_STATUS.FORBIDDEN);
      }
      
      this.logAction('remove_user_attempt', authUser.$id, { companyId, userId });
      
      const companyService = this.services.companyService as ICompanyService;
      await companyService.removeUserFromCompany(companyId, userId);
      
      this.logAction('remove_user_success', authUser.$id, { companyId, userId });
      
      return this.success({ message: 'User removed from company successfully' });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get company analytics
   */
  async getCompanyAnalytics(context: { user?: any; params: any; set: any }) {
    const { user, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      const { companyId } = params;
      
      if (!canAccessCompany(authUser, companyId) || !hasPermission(authUser, 'view_company_analytics')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to view analytics', HTTP_STATUS.FORBIDDEN);
      }
      
      const companyService = this.services.companyService as ICompanyService;
      const analytics = await companyService.getCompanyAnalytics(companyId);
      
      return this.success({ analytics });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get platform analytics (Super admin only)
   */
  async getPlatformAnalytics(context: { user?: any; set: any }) {
    const { user, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, null, set);
      
      if (!hasPermission(authUser, 'view_platform_analytics')) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return this.error('You do not have permission to view platform analytics', HTTP_STATUS.FORBIDDEN);
      }
      
      const companyService = this.services.companyService as ICompanyService;
      const analytics = await companyService.getPlatformAnalytics();
      
      return this.success({ analytics });
      
    } catch (error) {
      return this.handleBusinessError(error as Error, set);
    }
  }
}