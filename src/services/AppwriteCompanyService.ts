import { Client, Databases, Users, Query, ID } from 'node-appwrite';
import type { ICompanyService } from '../interfaces/ICompanyService.js';
import type { 
  Company, 
  User,
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  CompanyUserInvite,
  CompanyAnalytics,
  PlatformAnalytics
} from '../types/index.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { getDefaultUserData } from '../utils/permissions.js';
import crypto from 'crypto';

export class AppwriteCompanyService implements ICompanyService {
  private client: Client;
  private databases: Databases;
  private users: Users;
  private inviteStore: Map<string, {
    companyId: string;
    email: string;
    role: string;
    expiresAt: number;
  }> = new Map();

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
  }

  async createCompany(companyData: CreateCompanyRequest, adminUserId: string): Promise<Company> {
    try {
      // Verify admin user exists
      const adminUser = await this.users.get(adminUserId);
      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // Create company document
      const company = await this.databases.createDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        ID.unique(),
        {
          name: companyData.name,
          domain: companyData.domain.toLowerCase(),
          adminId: adminUserId,
          settings: {
            allowSelfRegistration: companyData.settings?.allowSelfRegistration ?? true,
            requireEmailVerification: companyData.settings?.requireEmailVerification ?? true,
            dataRetentionDays: companyData.settings?.dataRetentionDays ?? 365,
          },
          subscription: {
            tier: 'free',
            maxUsers: 10,
            currentUsers: 1, // Admin user
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Update admin user to be company admin
      const adminPrefs = adminUser.prefs || {};
      await this.users.updatePrefs(adminUserId, {
        ...adminPrefs,
        role: 'COMPANY_ADMIN',
        companyId: company.$id,
        permissions: getDefaultUserData('COMPANY_ADMIN').permissions,
      });

      logger.info('Company created successfully', {
        companyId: company.$id,
        adminId: adminUserId,
        domain: companyData.domain
      });

      return company as unknown as Company;
    } catch (error) {
      logger.error('Failed to create company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adminUserId,
        domain: companyData.domain
      });

      if (error instanceof Error) {
        if (error.message.includes('user_already_exists') || 
            error.message.includes('duplicate')) {
          throw new Error('A company with this domain already exists');
        }
      }

      throw new Error('Failed to create company');
    }
  }

  async updateCompany(companyId: string, updates: UpdateCompanyRequest): Promise<Company> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.domain) updateData.domain = updates.domain.toLowerCase();
      if (updates.logo) updateData.logo = updates.logo;
      if (updates.settings) updateData.settings = updates.settings;

      const company = await this.databases.updateDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        companyId,
        updateData
      );

      logger.info('Company updated successfully', { companyId });
      return company as unknown as Company;
    } catch (error) {
      logger.error('Failed to update company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });

      throw new Error('Failed to update company');
    }
  }

  async deleteCompany(companyId: string): Promise<void> {
    try {
      // Get all company users first
      const companyUsers = await this.getCompanyUsers(companyId);
      
      // Update all users to remove company association
      for (const user of companyUsers.users) {
        try {
          const userPrefs = user.preferences || {};
          await this.users.updatePrefs(user.$id, {
            ...userPrefs,
            role: 'INDIVIDUAL_USER',
            companyId: undefined,
            permissions: getDefaultUserData('INDIVIDUAL_USER').permissions,
          });
        } catch (userError) {
          logger.error('Failed to update user during company deletion', {
            userId: user.$id,
            companyId,
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }

      // Delete company document
      await this.databases.deleteDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        companyId
      );

      logger.info('Company deleted successfully', { companyId });
    } catch (error) {
      logger.error('Failed to delete company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });

      throw new Error('Failed to delete company');
    }
  }

  async getCompany(companyId: string): Promise<Company | null> {
    try {
      const company = await this.databases.getDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        companyId
      );

      return company as unknown as Company;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      logger.error('Failed to get company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });

      throw new Error('Failed to retrieve company');
    }
  }

  async listCompanies(page = 1, limit = 20): Promise<{ companies: Company[]; total: number }> {
    try {
      const result = await this.databases.listDocuments(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        [
          Query.limit(limit),
          Query.offset((page - 1) * limit),
          Query.orderDesc('createdAt')
        ]
      );

      logger.info('Companies listed', { 
        count: result.documents.length,
        total: result.total,
        page
      });

      return {
        companies: result.documents as unknown as Company[],
        total: result.total
      };
    } catch (error) {
      logger.error('Failed to list companies', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error('Failed to list companies');
    }
  }

  async inviteUser(companyId: string, invite: CompanyUserInvite): Promise<{ inviteId: string; inviteUrl: string }> {
    try {
      // Verify company exists
      const company = await this.getCompany(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Check if user already exists
      const existingUsers = await this.users.list([Query.equal('email', [invite.email])]);
      if (existingUsers.users.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Generate invite token
      const inviteId = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

      // Store invite
      this.inviteStore.set(inviteId, {
        companyId,
        email: invite.email,
        role: invite.role,
        expiresAt
      });

      const inviteUrl = `${config.app.frontendUrl}/invite/${inviteId}`;

      logger.info('User invite created', {
        inviteId,
        companyId,
        email: invite.email,
        role: invite.role
      });

      return { inviteId, inviteUrl };
    } catch (error) {
      logger.error('Failed to invite user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId,
        email: invite.email
      });

      throw error instanceof Error ? error : new Error('Failed to invite user');
    }
  }

  async acceptInvite(inviteToken: string, userData: { name: string; password: string }): Promise<{ user: User; company: Company }> {
    try {
      // Get invite data
      const invite = this.inviteStore.get(inviteToken);
      if (!invite) {
        throw new Error('Invalid or expired invite');
      }

      if (Date.now() > invite.expiresAt) {
        this.inviteStore.delete(inviteToken);
        throw new Error('Invite has expired');
      }

      // Get company
      const company = await this.getCompany(invite.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Create user account
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId);

      const sessionAccount = new (await import('node-appwrite')).Account(sessionClient);

      const userAccount = await sessionAccount.create(
        ID.unique(),
        invite.email,
        userData.password,
        userData.name
      );

      // Set user preferences with company data
      const defaultUserData = getDefaultUserData(invite.role as any, invite.companyId);
      await this.users.updatePrefs(userAccount.$id, {
        ...defaultUserData,
        role: invite.role,
        companyId: invite.companyId,
        emailVerified: false,
        isActive: true,
      });

      // Update company user count
      await this.databases.updateDocument(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        invite.companyId,
        {
          'subscription.currentUsers': company.subscription.currentUsers + 1,
          updatedAt: new Date().toISOString()
        }
      );

      // Clean up invite
      this.inviteStore.delete(inviteToken);

      // Transform user data
      const user: User = {
        $id: userAccount.$id,
        email: userAccount.email,
        name: userAccount.name,
        avatar: undefined,
        emailVerified: false,
        emailVerifiedAt: null,
        role: invite.role as any,
        companyId: invite.companyId,
        permissions: defaultUserData.permissions || [],
        subscription: defaultUserData.subscription || { tier: 'free' },
        preferences: defaultUserData.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: undefined,
        isActive: true,
        createdAt: userAccount.$createdAt,
        updatedAt: userAccount.$updatedAt,
      };

      logger.info('User invite accepted', {
        userId: user.$id,
        companyId: invite.companyId,
        role: invite.role
      });

      return { user, company };
    } catch (error) {
      logger.error('Failed to accept invite', {
        error: error instanceof Error ? error.message : 'Unknown error',
        inviteToken
      });

      throw error instanceof Error ? error : new Error('Failed to accept invite');
    }
  }

  async removeUserFromCompany(companyId: string, userId: string): Promise<void> {
    try {
      // Get user
      const user = await this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user to remove company association
      const userPrefs = user.prefs || {};
      await this.users.updatePrefs(userId, {
        ...userPrefs,
        role: 'INDIVIDUAL_USER',
        companyId: undefined,
        permissions: getDefaultUserData('INDIVIDUAL_USER').permissions,
      });

      // Update company user count
      const company = await this.getCompany(companyId);
      if (company) {
        await this.databases.updateDocument(
          config.appwrite.databaseId,
          config.appwrite.collections.companies,
          companyId,
          {
            'subscription.currentUsers': Math.max(0, company.subscription.currentUsers - 1),
            updatedAt: new Date().toISOString()
          }
        );
      }

      logger.info('User removed from company', { userId, companyId });
    } catch (error) {
      logger.error('Failed to remove user from company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        companyId
      });

      throw new Error('Failed to remove user from company');
    }
  }

  async updateUserRole(companyId: string, userId: string, newRole: 'COMPANY_ADMIN' | 'COMPANY_MANAGER' | 'COMPANY_USER'): Promise<User> {
    try {
      // Get user
      const user = await this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify user belongs to company
      const userPrefs = user.prefs || {};
      if (userPrefs.companyId !== companyId) {
        throw new Error('User does not belong to this company');
      }

      // Update user role and permissions
      await this.users.updatePrefs(userId, {
        ...userPrefs,
        role: newRole,
        permissions: getDefaultUserData(newRole).permissions,
      });

      // Get updated user
      const updatedUser = await this.users.get(userId);
      
      // Transform to User type (simplified)
      const transformedUser: User = {
        $id: updatedUser.$id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: userPrefs.avatar,
        emailVerified: userPrefs.emailVerified || false,
        emailVerifiedAt: userPrefs.emailVerifiedAt || null,
        role: newRole,
        companyId: companyId,
        permissions: getDefaultUserData(newRole).permissions || [],
        subscription: userPrefs.subscription || { tier: 'free' },
        preferences: userPrefs.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: userPrefs.lastLogin,
        isActive: userPrefs.isActive !== false,
        createdAt: updatedUser.$createdAt,
        updatedAt: updatedUser.$updatedAt,
      };

      logger.info('User role updated', { userId, companyId, newRole });
      return transformedUser;
    } catch (error) {
      logger.error('Failed to update user role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        companyId,
        newRole
      });

      throw error instanceof Error ? error : new Error('Failed to update user role');
    }
  }

  async getCompanyUsers(companyId: string, page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    try {
      // Get all users and filter by companyId in preferences
      const allUsers = await this.users.list([
        Query.limit(1000) // Get a large batch to filter
      ]);

      const companyUsers = allUsers.users.filter(user => {
        const prefs = user.prefs || {};
        return prefs.companyId === companyId;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = companyUsers.slice(startIndex, endIndex);

      // Transform users
      const transformedUsers: User[] = paginatedUsers.map(user => {
        const prefs = user.prefs || {};
        return {
          $id: user.$id,
          email: user.email,
          name: user.name,
          avatar: prefs.avatar,
          emailVerified: prefs.emailVerified || false,
          emailVerifiedAt: prefs.emailVerifiedAt || null,
          role: prefs.role || 'INDIVIDUAL_USER',
          companyId: prefs.companyId,
          permissions: prefs.permissions || [],
          subscription: prefs.subscription || { tier: 'free' },
          preferences: prefs.preferences || {
            theme: 'auto',
            notifications: true,
            preferredAIModel: 'gpt-4',
            language: 'en'
          },
          lastLogin: prefs.lastLogin,
          isActive: prefs.isActive !== false,
          createdAt: user.$createdAt,
          updatedAt: user.$updatedAt,
        };
      });

      logger.info('Company users retrieved', { 
        companyId,
        count: transformedUsers.length,
        total: companyUsers.length
      });

      return {
        users: transformedUsers,
        total: companyUsers.length
      };
    } catch (error) {
      logger.error('Failed to get company users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });

      throw new Error('Failed to get company users');
    }
  }

  async assignUserToCompanyByDomain(email: string): Promise<Company | null> {
    try {
      const domain = email.split('@')[1];
      if (!domain) return null;

      // Find company by domain
      const companies = await this.databases.listDocuments(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        [Query.equal('domain', [domain.toLowerCase()])]
      );

      if (companies.documents.length === 0) {
        return null;
      }

      const company = companies.documents[0] as unknown as Company;
      
      // Check if company allows self-registration
      if (!company.settings.allowSelfRegistration) {
        return null;
      }

      logger.info('User assigned to company by domain', { email, domain, companyId: company.$id });
      return company;
    } catch (error) {
      logger.error('Failed to assign user by domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      });

      return null;
    }
  }

  async getCompanyAnalytics(companyId: string): Promise<CompanyAnalytics> {
    try {
      const company = await this.getCompany(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const companyUsers = await this.getCompanyUsers(companyId);
      
      // This is a simplified version - in production you'd query actual data
      const analytics: CompanyAnalytics = {
        totalUsers: companyUsers.total,
        activeUsers: companyUsers.users.filter(u => u.isActive).length,
        newUsersThisMonth: 0, // Would need to calculate based on createdAt
        journalEntries: 0, // Would need to query journal collection
        moodLogs: 0, // Would need to query mood collection
        subscriptionTier: company.subscription.tier,
        usageMetrics: {
          dailyActiveUsers: Array(30).fill(0),
          weeklyJournalEntries: Array(12).fill(0),
          monthlyMoodLogs: Array(12).fill(0),
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get company analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });

      throw new Error('Failed to get company analytics');
    }
  }

  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      const companies = await this.listCompanies(1, 1000);
      const allUsers = await this.users.list([Query.limit(10000)]);

      const analytics: PlatformAnalytics = {
        totalUsers: allUsers.total,
        totalCompanies: companies.total,
        activeCompanies: companies.companies.filter(c => c.subscription.currentUsers > 0).length,
        subscriptionDistribution: {
          free: companies.companies.filter(c => c.subscription.tier === 'free').length,
          premium: companies.companies.filter(c => c.subscription.tier === 'premium').length,
          enterprise: companies.companies.filter(c => c.subscription.tier === 'enterprise').length,
        },
        revenueMetrics: {
          monthlyRecurringRevenue: 0, // Would calculate based on subscriptions
          totalRevenue: 0,
          averageRevenuePerUser: 0,
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get platform analytics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error('Failed to get platform analytics');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.databases.list();
      await this.users.list([Query.limit(1)]);
      return true;
    } catch (error) {
      logger.error('Company service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}