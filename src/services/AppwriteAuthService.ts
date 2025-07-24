import { Client, Account, Users, ID } from 'node-appwrite';
import type { IAuthService } from '../interfaces/IAuthService.js';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '../types/index.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class AppwriteAuthService implements IAuthService {
  private client: Client;
  private account: Account;
  private users: Users;

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.account = new Account(this.client);
    this.users = new Users(this.client);
  }

  async register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }> {
    try {
      // Create user account
      const userAccount = await this.users.create(
        ID.unique(),
        userData.email,
        undefined, // phone
        userData.password,
        userData.name
      );

      // Create session
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId);
      
      const sessionAccount = new Account(sessionClient);
      const session = await sessionAccount.createEmailPasswordSession(
        userData.email,
        userData.password
      );

      // Get user with preferences
      const user = await this.transformAppwriteUser(userAccount);
      const tokens = this.transformAppwriteSession(session);

      logger.info('User registered successfully', { 
        userId: user.$id, 
        email: userData.email 
      });

      return { user, session: tokens };
    } catch (error) {
      logger.error('Registration failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('user_already_exists')) {
          throw new Error('Account already exists with this email');
        }
      }
      
      throw new Error('Failed to create account');
    }
  }

  async login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId);
      
      const sessionAccount = new Account(sessionClient);
      const session = await sessionAccount.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      // Set session for client
      sessionClient.setSession(session.secret);
      
      // Get user account
      const userAccount = await sessionAccount.get();
      const user = await this.transformAppwriteUser(userAccount);
      const tokens = this.transformAppwriteSession(session);

      logger.info('User logged in successfully', { 
        userId: user.$id, 
        email: credentials.email 
      });

      return { user, session: tokens };
    } catch (error) {
      logger.error('Login failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email: credentials.email 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials') || 
            error.message.includes('user_invalid_credentials')) {
          throw new Error('Invalid email or password');
        }
      }
      
      throw new Error('Login failed');
    }
  }

  async logout(sessionId: string): Promise<void> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      await sessionAccount.deleteSession('current');

      logger.info('User logged out successfully', { sessionId });
    } catch (error) {
      logger.error('Logout failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      // Don't throw error on logout - always succeed
    }
  }

  async validateSession(sessionId: string): Promise<{ user: User; session: AuthTokens }> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // Get current session to validate
      const session = await sessionAccount.getSession('current');
      const userAccount = await sessionAccount.get();

      const user = await this.transformAppwriteUser(userAccount);
      const tokens = this.transformAppwriteSession(session);

      return { user, session: tokens };
    } catch (error) {
      logger.error('Session validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('session_not_found') || 
            error.message.includes('Unauthorized')) {
          throw new Error('Session expired or invalid');
        }
      }
      
      throw new Error('Session validation failed');
    }
  }

  async refreshSession(sessionId: string): Promise<{ user: User; session: AuthTokens }> {
    try {
      // Appwrite sessions are automatically managed and don't need explicit refresh
      // Just validate the current session
      return await this.validateSession(sessionId);
    } catch (error) {
      logger.error('Session refresh failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      throw new Error('Session refresh failed');
    }
  }

  async getCurrentUser(sessionId: string): Promise<User> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      const userAccount = await sessionAccount.get();

      return await this.transformAppwriteUser(userAccount);
    } catch (error) {
      logger.error('Failed to get current user', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      throw new Error('Failed to get user information');
    }
  }

  async updateProfile(
    sessionId: string, 
    updates: { name?: string; avatar?: string }
  ): Promise<User> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // Update name if provided
      if (updates.name) {
        await sessionAccount.updateName(updates.name);
      }

      // Get updated user
      const userAccount = await sessionAccount.get();
      const user = await this.transformAppwriteUser(userAccount);

      // Handle avatar update through preferences
      if (updates.avatar) {
        const updatedPreferences = {
          ...user.preferences,
          avatar: updates.avatar,
        };
        
        await sessionAccount.updatePrefs(updatedPreferences);
        user.avatar = updates.avatar;
      }

      logger.info('User profile updated', { userId: user.$id });
      return user;
    } catch (error) {
      logger.error('Failed to update profile', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      throw new Error('Failed to update profile');
    }
  }

  async updatePreferences(
    sessionId: string, 
    preferences: {
      theme?: 'light' | 'dark' | 'auto';
      notifications?: boolean;
      preferredAIModel?: string;
      language?: string;
    }
  ): Promise<User> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // Get current preferences
      const userAccount = await sessionAccount.get();
      const currentPrefs = userAccount.prefs || {};
      
      // Merge with new preferences
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
      };
      
      await sessionAccount.updatePrefs(updatedPrefs);
      
      // Return updated user
      const updatedUserAccount = await sessionAccount.get();
      const user = await this.transformAppwriteUser(updatedUserAccount);

      logger.info('User preferences updated', { userId: user.$id });
      return user;
    } catch (error) {
      logger.error('Failed to update preferences', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      throw new Error('Failed to update preferences');
    }
  }

  async changePassword(
    sessionId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      await sessionAccount.updatePassword(newPassword, currentPassword);

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error) {
        if (error.message.includes('user_invalid_credentials')) {
          throw new Error('Current password is incorrect');
        }
      }
      
      throw new Error('Failed to change password');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const sessionAccount = new Account(this.client);
      await sessionAccount.createRecovery(
        email,
        `${config.appwrite.endpoint}/auth/recovery` // Recovery URL
      );

      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      });
      
      // Don't reveal if user exists
      // Always appear to succeed for security
    }
  }

  async confirmPasswordReset(secret: string, password: string): Promise<void> {
    try {
      const sessionAccount = new Account(this.client);
      await sessionAccount.updateRecovery(
        secret,
        secret, // userId - Appwrite uses secret as both
        password
      );

      logger.info('Password reset completed');
    } catch (error) {
      logger.error('Failed to complete password reset', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to reset password');
    }
  }

  async deleteAccount(sessionId: string, password: string): Promise<void> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // First verify password by trying to update it
      await sessionAccount.updatePassword(password, password);
      
      // Delete the account (use deleteIdentity for newer Appwrite versions)
      try {
        await (sessionAccount as any).deleteIdentity();
      } catch {
        // Fallback for older versions
        await (sessionAccount as any).delete();
      }

      logger.info('Account deleted successfully');
    } catch (error) {
      logger.error('Failed to delete account', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error) {
        if (error.message.includes('user_invalid_credentials')) {
          throw new Error('Password is incorrect');
        }
      }
      
      throw new Error('Failed to delete account');
    }
  }

  // Helper methods
  private async transformAppwriteUser(appwriteUser: any): Promise<User> {
    const prefs = appwriteUser.prefs || {};
    
    return {
      $id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      avatar: prefs.avatar,
      subscription: {
        tier: prefs.subscription?.tier || 'free',
        validUntil: prefs.subscription?.validUntil,
      },
      preferences: {
        theme: prefs.theme || 'auto',
        notifications: prefs.notifications !== false,
        preferredAIModel: prefs.preferredAIModel || 'gpt-4',
        language: prefs.language || 'en',
      },
      createdAt: appwriteUser.$createdAt,
      updatedAt: appwriteUser.$updatedAt,
    };
  }

  private transformAppwriteSession(appwriteSession: any): AuthTokens {
    return {
      accessToken: appwriteSession.secret,
      refreshToken: appwriteSession.$id, // Use session ID as refresh token
      expiresIn: new Date(appwriteSession.expire).getTime() - Date.now(),
    };
  }
}