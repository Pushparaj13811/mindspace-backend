import type { 
  ICompanyService, 
  CompanyListFilters, 
  CompanyListResponse,
  UserListFilters,
  CompanyUsersResponse,
  InviteAcceptanceData
} from '../core/interfaces/ICompanyService.js';
import type { IDatabaseService, DatabaseQuery } from '../core/interfaces/IDatabaseService.js';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyAnalytics, CompanyUserInvite, User } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Company service implementation
 */
export class CompanyService implements ICompanyService {
  constructor(private databaseService: IDatabaseService) {}

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    try {
      logger.info('Creating company', { name: data.name, domain: data.domain });

      const companyData = {
        name: data.name,
        domain: data.domain,
        adminId: '', // Will be set by controller
        settings: {
          allowSelfRegistration: data.settings?.allowSelfRegistration ?? true,
          requireEmailVerification: data.settings?.requireEmailVerification ?? true,
          dataRetentionDays: data.settings?.dataRetentionDays ?? 365
        },
        subscription: {
          tier: 'free' as const,
          maxUsers: 50,
          currentUsers: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const company = await this.databaseService.create<Company>('companies', companyData);
      
      logger.info('Company created successfully', { companyId: company.$id });
      return company;
    } catch (error) {
      logger.error('Failed to create company', {
        name: data.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getCompany(id: string): Promise<Company> {
    try {
      const company = await this.databaseService.read<Company>('companies', id);
      return company;
    } catch (error) {
      logger.error('Failed to get company', {
        companyId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
    try {
      logger.info('Updating company', { companyId: id });

      // Get current company to merge settings properly
      const currentCompany = await this.databaseService.read<Company>('companies', id);
      
      const { settings, ...otherData } = data;
      
      const updateData: Partial<Company> = {
        ...otherData,
        updatedAt: new Date().toISOString()
      };

      // If settings are provided, merge with existing settings
      if (settings) {
        updateData.settings = {
          allowSelfRegistration: settings.allowSelfRegistration ?? currentCompany.settings.allowSelfRegistration,
          requireEmailVerification: settings.requireEmailVerification ?? currentCompany.settings.requireEmailVerification,
          dataRetentionDays: settings.dataRetentionDays ?? currentCompany.settings.dataRetentionDays
        };
      }

      const company = await this.databaseService.update<Company>('companies', id, updateData);
      
      logger.info('Company updated successfully', { companyId: id });
      return company;
    } catch (error) {
      logger.error('Failed to update company', {
        companyId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteCompany(id: string): Promise<void> {
    try {
      logger.info('Deleting company', { companyId: id });

      await this.databaseService.delete('companies', id);
      
      logger.info('Company deleted successfully', { companyId: id });
    } catch (error) {
      logger.error('Failed to delete company', {
        companyId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async listCompanies(filters: CompanyListFilters = {}): Promise<CompanyListResponse> {
    try {
      const queries: DatabaseQuery[] = [];
      
      if (filters.search) {
        queries.push({ field: 'name', operator: 'contains', value: filters.search });
      }

      const result = await this.databaseService.list<Company>('companies', queries);
      
      return {
        companies: result.documents,
        total: result.total,
        page: filters.page || 1,
        limit: filters.limit || 20
      };
    } catch (error) {
      logger.error('Failed to list companies', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async inviteUser(companyId: string, invite: CompanyUserInvite): Promise<string> {
    try {
      logger.info('Inviting user to company', { 
        companyId, 
        email: invite.email, 
        role: invite.role 
      });

      // TODO: Implement actual invite functionality
      // Generate invite token
      const inviteToken = this.generateInviteToken();
      
      // TODO: Send invite email
      
      logger.info('User invited successfully', { companyId, email: invite.email });
      return inviteToken;
    } catch (error) {
      logger.error('Failed to invite user', {
        companyId,
        email: invite.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async acceptInvitation(token: string, userData: InviteAcceptanceData): Promise<void> {
    try {
      logger.info('Accepting company invitation', { token });

      // TODO: Implement actual invitation acceptance
      
      logger.info('Invitation accepted successfully', { token });
    } catch (error) {
      logger.error('Failed to accept invitation', {
        token,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getCompanyUsers(companyId: string, filters: UserListFilters = {}): Promise<CompanyUsersResponse> {
    try {
      const queries: DatabaseQuery[] = [
        { field: 'companyId', operator: 'equal', value: companyId }
      ];

      if (filters.role) {
        queries.push({ field: 'role', operator: 'equal', value: filters.role });
      }

      if (filters.search) {
        queries.push({ field: 'name', operator: 'contains', value: filters.search });
      }

      const result = await this.databaseService.list<User>('users', queries);
      
      return {
        users: result.documents,
        total: result.total,
        page: filters.page || 1,
        limit: filters.limit || 20
      };
    } catch (error) {
      logger.error('Failed to get company users', {
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateUserRole(companyId: string, userId: string, role: string): Promise<void> {
    try {
      logger.info('Updating user role in company', { companyId, userId, role });

      await this.databaseService.update<User>('users', userId, {
        role: role as any,
        updatedAt: new Date().toISOString()
      });
      
      logger.info('User role updated successfully', { companyId, userId, role });
    } catch (error) {
      logger.error('Failed to update user role', {
        companyId,
        userId,
        role,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async removeUser(companyId: string, userId: string): Promise<void> {
    try {
      logger.info('Removing user from company', { companyId, userId });

      await this.databaseService.update<User>('users', userId, {
        companyId: undefined,
        role: 'INDIVIDUAL_USER',
        updatedAt: new Date().toISOString()
      });
      
      logger.info('User removed from company successfully', { companyId, userId });
    } catch (error) {
      logger.error('Failed to remove user from company', {
        companyId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getAnalytics(companyId: string, period: string = '30d'): Promise<CompanyAnalytics> {
    try {
      logger.info('Getting company analytics', { companyId, period });

      // TODO: Implement actual analytics calculation
      const analytics: CompanyAnalytics = {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        journalEntries: 0,
        moodLogs: 0,
        subscriptionTier: 'free',
        usageMetrics: {
          dailyActiveUsers: [],
          weeklyJournalEntries: [],
          monthlyMoodLogs: []
        }
      };
      
      return analytics;
    } catch (error) {
      logger.error('Failed to get company analytics', {
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async checkUserAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      const user = await this.databaseService.read<User>('users', userId);
      return user.companyId === companyId || user.role === 'SUPER_ADMIN';
    } catch (error) {
      logger.error('Failed to check user access', {
        userId,
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private generateInviteToken(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}