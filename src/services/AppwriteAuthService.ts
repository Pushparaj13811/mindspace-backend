import { Client, Account, Users, ID } from 'node-appwrite';
import type { IAuthService } from '../interfaces/IAuthService.js';
import type { User, AuthTokens, LoginRequest, RegisterRequest, OAuth2Session } from '../types/index.js';
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
        if (error.message.includes('user_already_exists') || 
            error.message.includes('A user with the same id, email, or phone already exists')) {
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
      
      // Get user account with session
      const userAccount = await sessionAccount.get();
      
      // Also get user from admin client for complete data
      const adminUser = await this.users.get(userAccount.$id);
      
      const user = await this.transformAppwriteUser(adminUser);
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
        if (error.message.includes('missing scope')) {
          // This error typically means the user doesn't exist or credentials are wrong
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

  // OAuth2 methods
  async createOAuth2Session(provider: string, successUrl?: string, failureUrl?: string): Promise<string> {
    try {
      // Validate provider
      if (!provider || provider !== 'google') {
        throw new Error('Only Google OAuth2 provider is supported');
      }

      // Set default URLs if not provided
      const defaultSuccessUrl = `${config.app.frontendUrl}/auth/oauth/success`;
      const defaultFailureUrl = `${config.app.frontendUrl}/auth/oauth/error`;
      
      const finalSuccessUrl = successUrl || defaultSuccessUrl;
      const finalFailureUrl = failureUrl || defaultFailureUrl;

      // Create OAuth2 token using Appwrite
      const redirectUrl = await this.account.createOAuth2Token(
        provider as any,
        finalSuccessUrl,
        finalFailureUrl
      );

      logger.info('OAuth2 session created', { 
        provider, 
        successUrl: finalSuccessUrl, 
        failureUrl: finalFailureUrl 
      });

      return redirectUrl;
    } catch (error) {
      logger.error('Failed to create OAuth2 session', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('provider_not_configured')) {
          throw new Error('OAuth2 provider not configured in Appwrite');
        }
        if (error.message.includes('Only Google OAuth2 provider is supported')) {
          throw error;
        }
      }
      
      throw new Error('Failed to create OAuth2 session');
    }
  }

  async handleOAuth2Callback(userId: string, secret: string): Promise<{ user: User; session: AuthTokens }> {
    try {
      if (!userId || !secret) {
        throw new Error('OAuth2 callback requires userId and secret');
      }

      // Create session client with the OAuth2 session
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(secret);
      
      const sessionAccount = new Account(sessionClient);
      
      // Get user account and session info
      const userAccount = await sessionAccount.get();
      const sessionInfo = await sessionAccount.getSession('current');
      
      // Verify the userId matches
      if (userAccount.$id !== userId) {
        throw new Error('OAuth2 callback userId mismatch');
      }

      // Transform user and session data
      const user = await this.transformAppwriteUser(userAccount);
      const tokens = this.transformAppwriteSession(sessionInfo);

      logger.info('OAuth2 callback processed successfully', { 
        userId: user.$id, 
        email: user.email 
      });

      return { user, session: tokens };
    } catch (error) {
      logger.error('OAuth2 callback failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('session_not_found') || 
            error.message.includes('Unauthorized')) {
          throw new Error('OAuth2 session expired or invalid');
        }
        if (error.message.includes('OAuth2 callback requires userId and secret') ||
            error.message.includes('OAuth2 callback userId mismatch')) {
          throw error;
        }
      }
      
      throw new Error('OAuth2 callback processing failed');
    }
  }

  async listOAuth2Sessions(sessionId: string): Promise<OAuth2Session[]> {
    try {
      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // Get all sessions for the user
      const sessions = await sessionAccount.listSessions();
      
      // Filter and transform OAuth2 sessions
      const oauth2Sessions: OAuth2Session[] = sessions.sessions
        .filter((session: any) => session.provider && session.provider !== 'email')
        .map((session: any) => ({
          provider: session.provider || 'unknown',
          providerUid: session.providerUid || '',
          providerAccessToken: session.providerAccessToken || '',
          providerRefreshToken: session.providerRefreshToken,
          providerAccessTokenExpiry: session.providerAccessTokenExpiry || '',
          createdAt: session.$createdAt,
        }));

      logger.info('OAuth2 sessions listed', { 
        sessionCount: oauth2Sessions.length 
      });

      return oauth2Sessions;
    } catch (error) {
      logger.error('Failed to list OAuth2 sessions', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('session_not_found') || 
            error.message.includes('Unauthorized')) {
          throw new Error('Session expired or invalid');
        }
      }
      
      throw new Error('Failed to list OAuth2 sessions');
    }
  }

  async deleteOAuth2Session(sessionId: string, provider: string): Promise<void> {
    try {
      if (!provider) {
        throw new Error('Provider is required to delete OAuth2 session');
      }

      const sessionClient = new Client()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId)
        .setSession(sessionId);
      
      const sessionAccount = new Account(sessionClient);
      
      // Get all sessions to find the OAuth2 session with the specified provider
      const sessions = await sessionAccount.listSessions();
      
      const oauth2Session = sessions.sessions.find((session: any) => 
        session.provider === provider
      );
      
      if (!oauth2Session) {
        throw new Error(`No OAuth2 session found for provider: ${provider}`);
      }
      
      // Delete the specific session
      await sessionAccount.deleteSession(oauth2Session.$id);

      logger.info('OAuth2 session deleted', { 
        provider,
        sessionId: oauth2Session.$id 
      });
    } catch (error) {
      logger.error('Failed to delete OAuth2 session', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider,
        sessionId 
      });
      
      if (error instanceof Error) {
        if (error.message.includes('session_not_found') || 
            error.message.includes('Unauthorized')) {
          throw new Error('Session expired or invalid');
        }
        if (error.message.includes('Provider is required') ||
            error.message.includes('No OAuth2 session found')) {
          throw error;
        }
      }
      
      throw new Error('Failed to delete OAuth2 session');
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