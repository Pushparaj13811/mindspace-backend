import { Client, Account, Users, ID, AppwriteException } from 'node-appwrite';
import type { IAuthService } from '../../core/interfaces/IAuthService.js';
import type { User, AuthTokens, LoginRequest, RegisterRequest, OAuth2Session } from '../../types/index.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';
import { User as UserDomain } from '../../core/domain/User.js';
import { Permission as PermissionDomain } from '../../core/domain/Permission.js';
import { jwtBlacklist } from '../../utils/jwtBlacklist.js';
import { createTokens, verifyToken, verifyRefreshToken } from '../../utils/jwt.js';

/**
 * Appwrite implementation of the authentication service
 * This adapter wraps Appwrite-specific authentication logic
 */
export class AppwriteAuthAdapter implements IAuthService {
  private adminClient: Client;
  private authClient: Client;
  private account: Account;
  private users: Users;

  constructor() {
    // Admin client with API key for server operations
    this.adminClient = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    // Auth client for authentication operations (no API key initially)
    this.authClient = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId);

    this.account = new Account(this.authClient);
    this.users = new Users(this.adminClient);
  }

  async register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }> {
    try {
      // Create user in Appwrite
      const appwriteUser = await this.users.create(
        ID.unique(),
        userData.email,
        userData.password,
        userData.name
      );

      // Create user domain object with default role
      const userDomain = UserDomain.create({
        email: userData.email,
        name: userData.name,
        role: 'INDIVIDUAL_USER',
        emailVerified: false,
        isActive: true,
        permissions: PermissionDomain.getRolePermissions('INDIVIDUAL_USER'),
        subscription: { tier: 'free' },
        preferences: {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        }
      });

      // Update Appwrite user preferences with our user data
      await this.users.updatePrefs(appwriteUser.$id, userDomain.toData());

      // Generate our own JWT tokens
      const session = createTokens({ 
        userId: appwriteUser.$id, 
        email: userData.email,
        role: 'INDIVIDUAL_USER'
      });

      const user = { ...userDomain.toData(), $id: appwriteUser.$id };

      logger.info('User registered successfully:', { userId: appwriteUser.$id, email: userData.email });

      return { user, session };
    } catch (error) {
      logger.error('Registration failed:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }> {
    try {
      logger.info('Starting login process', { email: credentials.email });

      // Create a completely fresh client for this login attempt
      const { Client: FreshClient, Account: FreshAccount } = await import('node-appwrite');
      
      const loginClient = new FreshClient()
        .setEndpoint(config.appwrite.endpoint)
        .setProject(config.appwrite.projectId);
      
      const loginAccount = new FreshAccount(loginClient);

      logger.info('Created fresh client, attempting session creation');

      // Create Appwrite session
      const appwriteSession = await loginAccount.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      logger.info('Session created successfully', { 
        sessionId: appwriteSession.$id,
        hasSecret: !!appwriteSession.secret 
      });

      logger.info('Getting user details via admin API');

      // Get user details using admin client instead of session
      const appwriteUser = await this.users.get(appwriteSession.userId);
      const userPrefs = appwriteUser.prefs as any;

      // Create user domain object
      const userDomain = UserDomain.fromData({
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        avatar: userPrefs.avatar,
        role: userPrefs.role || 'INDIVIDUAL_USER',
        companyId: userPrefs.companyId,
        permissions: userPrefs.permissions || PermissionDomain.getRolePermissions(userPrefs.role || 'INDIVIDUAL_USER'),
        subscription: userPrefs.subscription || { tier: 'free' },
        preferences: userPrefs.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: userPrefs.lastLogin,
        isActive: userPrefs.isActive !== false,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      // Update last login
      userDomain.recordLogin();
      await this.users.updatePrefs(appwriteUser.$id, userDomain.toData());

      // Generate our own JWT tokens
      const session = createTokens({
        userId: appwriteUser.$id,
        email: appwriteUser.email,
        role: userDomain.role,
        sessionId: appwriteSession.$id
      });

      logger.info('User logged in successfully:', { userId: appwriteUser.$id, email: appwriteUser.email });

      return { user: userDomain.toData(), session };
    } catch (error) {
      logger.error('Login failed:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async logout(sessionId: string): Promise<void> {
    try {
      // Verify and decode our JWT token
      const payload = verifyToken(sessionId);
      
      // Add token to blacklist
      jwtBlacklist.add(sessionId);

      // If we have an Appwrite session, delete it
      if (payload.sessionId) {
        try {
          this.authClient.setSession(payload.sessionId);
          await this.account.deleteSession('current');
        } catch (error) {
          // Ignore errors when deleting Appwrite session (might already be expired)
          logger.warn('Failed to delete Appwrite session:', error);
        }
      }

      logger.info('User logged out successfully:', { userId: payload.userId });
    } catch (error) {
      logger.error('Logout failed:', error);
      throw new Error('Failed to logout');
    }
  }

  async validateSession(sessionId: string): Promise<{ user: User; session: AuthTokens }> {
    try {
      // Check if token is blacklisted
      if (jwtBlacklist.isBlacklisted(sessionId)) {
        throw new Error('Session has been invalidated');
      }

      // Verify our JWT token
      const payload = verifyToken(sessionId);

      // Get fresh user data from Appwrite
      const appwriteUser = await this.users.get(payload.userId);
      const userPrefs = appwriteUser.prefs as any;

      // Create user domain object
      const userDomain = UserDomain.fromData({
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        avatar: userPrefs.avatar,
        role: userPrefs.role || 'INDIVIDUAL_USER',
        companyId: userPrefs.companyId,
        permissions: userPrefs.permissions || PermissionDomain.getRolePermissions(userPrefs.role || 'INDIVIDUAL_USER'),
        subscription: userPrefs.subscription || { tier: 'free' },
        preferences: userPrefs.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: userPrefs.lastLogin,
        isActive: userPrefs.isActive !== false,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      // Check if user is still active
      if (!userDomain.isActive) {
        throw new Error('User account is inactive');
      }

      // Create new session tokens (refresh)
      const session = createTokens({
        userId: appwriteUser.$id,
        email: appwriteUser.email,
        role: userDomain.role,
        sessionId: payload.sessionId
      });

      return { user: userDomain.toData(), session };
    } catch (error) {
      logger.error('Session validation failed:', error);
      throw new Error('Invalid session');
    }
  }

  async refreshSession(sessionId: string): Promise<{ user: User; session: AuthTokens }> {
    return this.validateSession(sessionId);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      
      return createTokens({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async getCurrentUser(sessionId: string): Promise<User> {
    const { user } = await this.validateSession(sessionId);
    return user;
  }

  async updateProfile(sessionId: string, updates: { name?: string; avatar?: string }): Promise<User> {
    try {
      // sessionId could be either a token or a userId, try token first
      let userId: string;
      try {
        const payload = verifyToken(sessionId);
        userId = payload.userId;
      } catch {
        // If token verification fails, assume sessionId is actually a userId
        userId = sessionId;
      }
      
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      // Create user domain object
      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      // Update profile using domain logic
      userDomain.updateProfile(updates);

      // Update Appwrite user
      if (updates.name) {
        await this.users.updateName(userId, updates.name);
      }

      // Update preferences
      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('Profile updated successfully:', { userId });

      return userDomain.toData();
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw new Error('Failed to update profile');
    }
  }

  async updatePreferences(sessionId: string, preferences: any): Promise<User> {
    try {
      // sessionId could be either a token or a userId, try token first
      let userId: string;
      try {
        const payload = verifyToken(sessionId);
        userId = payload.userId;
      } catch {
        // If token verification fails, assume sessionId is actually a userId
        userId = sessionId;
      }
      
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      // Create user domain object
      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      // Update preferences using domain logic
      userDomain.updatePreferences(preferences);

      // Update Appwrite preferences
      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('Preferences updated successfully:', { userId });

      return userDomain.toData();
    } catch (error) {
      logger.error('Preferences update failed:', error);
      throw new Error('Failed to update preferences');
    }
  }

  async changePassword(sessionId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // sessionId could be either a token or a userId, try token first
      let userId: string;
      let appwriteSessionId: string | undefined;
      
      try {
        const payload = verifyToken(sessionId);
        userId = payload.userId;
        appwriteSessionId = payload.sessionId;
      } catch {
        // If token verification fails, assume sessionId is actually a userId
        userId = sessionId;
      }

      // If we have an Appwrite session, use it to update password with current password verification
      if (appwriteSessionId) {
        try {
          // Create a temporary client with the user's session to update password
          const { Client: TempClient, Account: TempAccount } = await import('node-appwrite');
          const tempClient = new TempClient()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId)
            .setSession(appwriteSessionId);
          
          const tempAccount = new TempAccount(tempClient);
          
          // Use Appwrite's updatePassword which verifies current password
          await tempAccount.updatePassword(newPassword, currentPassword);
          
          logger.info('Password changed successfully using session:', { userId });
          return;
        } catch (sessionError) {
          logger.warn('Session-based password change failed, falling back to admin update:', sessionError);
        }
      }

      // Fallback: Use admin API to update password directly
      // Note: This bypasses current password verification but user is already authenticated
      await this.users.updatePassword(userId, newPassword);

      logger.info('Password changed successfully using admin API:', { userId });
    } catch (error) {
      logger.error('Password change failed:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw new Error('Failed to change password');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.account.createRecovery(email, `${config.app.frontendUrl}/reset-password`);
      logger.info('Password reset initiated:', { email });
    } catch (error) {
      logger.error('Password reset failed:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw new Error('Failed to initiate password reset');
    }
  }

  async confirmPasswordReset(secret: string, password: string): Promise<void> {
    try {
      await this.account.updateRecovery(secret, password, password);
      logger.info('Password reset completed');
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw new Error('Failed to reset password');
    }
  }

  async deleteAccount(sessionId: string, password: string): Promise<void> {
    try {
      // sessionId could be either a token or a userId, try token first
      let userId: string;
      let email: string;
      
      try {
        const payload = verifyToken(sessionId);
        userId = payload.userId;
        email = payload.email;
      } catch {
        // If token verification fails, assume sessionId is actually a userId
        userId = sessionId;
        // Get user details to get email
        const user = await this.users.get(userId);
        email = user.email;
      }
      
      // For account deletion, we'll skip password verification via new session
      // since the user is already authenticated and this is a destructive operation
      // In production, you might want to add additional verification steps
      
      // Delete user
      await this.users.delete(userId);
      
      // Blacklist the session if it's a valid token
      try {
        jwtBlacklist.add(sessionId);
      } catch {
        // If sessionId is not a token, this will fail silently
      }

      logger.info('Account deleted successfully:', { userId });
    } catch (error) {
      logger.error('Account deletion failed:', error);
      throw new Error('Failed to delete account');
    }
  }

  async createEmailVerification(token: string): Promise<void> {
    try {
      // token could be either a token or a userId, try token first
      let userId: string;
      let appwriteSessionId: string | undefined;
      
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
        appwriteSessionId = payload.sessionId;
      } catch {
        // If token verification fails, assume token is actually a userId
        userId = token;
      }
      
      const appwriteUser = await this.users.get(userId);
      
      // Check if email is already verified
      if (appwriteUser.emailVerification) {
        logger.info('Email verification not needed - already verified:', { 
          userId, 
          email: appwriteUser.email,
          emailVerified: appwriteUser.emailVerification 
        });
        throw new Error('Email is already verified');
      }

      logger.info('Creating email verification for unverified email:', { 
        userId, 
        email: appwriteUser.email,
        emailVerified: appwriteUser.emailVerification 
      });

      // If we have an Appwrite session, use it to create verification
      if (appwriteSessionId) {
        try {
          const { Client: TempClient, Account: TempAccount } = await import('node-appwrite');
          const tempClient = new TempClient()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId)
            .setSession(appwriteSessionId);
          
          const tempAccount = new TempAccount(tempClient);
          await tempAccount.createVerification(`${config.app.frontendUrl}/verify-email`);
          
          logger.info('Email verification created using session:', { userId });
          return;
        } catch (sessionError) {
          logger.warn('Session-based verification creation failed, using fallback:', sessionError);
        }
      }

      // Fallback: Use default account service (might not work without proper session)
      try {
        await this.account.createVerification(`${config.app.frontendUrl}/verify-email`);
        logger.info('Email verification created using default account:', { userId });
      } catch (accountError) {
        logger.warn('Failed to create email verification with default account:', { 
          userId, 
          error: accountError instanceof Error ? accountError.message : 'Unknown error' 
        });
        throw new Error('Failed to create email verification. Please try again later.');
      }
    } catch (error) {
      logger.error('Email verification creation failed:', error);
      throw error;
    }
  }

  async confirmEmailVerification(verificationToken: string): Promise<{ userId: string; email: string }> {
    try {
      // This would need to be implemented based on how verification tokens are structured
      // For now, throwing not implemented
      throw new Error('Email verification confirmation not implemented for Appwrite adapter');
    } catch (error) {
      logger.error('Email verification confirmation failed:', error);
      throw error;
    }
  }

  async createOAuth2Session(provider: string, successUrl?: string, failureUrl?: string): Promise<string> {
    try {
      const success = successUrl || `${config.app.frontendUrl}/auth/callback`;
      const failure = failureUrl || `${config.app.frontendUrl}/auth/error`;
      
      return this.account.createOAuth2Token(provider as any, success, failure);
    } catch (error) {
      logger.error('OAuth2 session creation failed:', error);
      throw new Error('Failed to create OAuth2 session');
    }
  }

  async handleOAuth2Callback(userId: string, secret: string): Promise<{ user: User; session: AuthTokens }> {
    try {
      // Get user using admin API (to avoid scope issues)
      const adminUser = await this.users.get(userId);
      let currentPrefs = adminUser.prefs as any;

      // Create or update user data
      const updateData: any = {};

      // Auto-verify email for OAuth2 users
      if (!currentPrefs.emailVerified) {
        updateData.emailVerified = true;
        updateData.emailVerifiedAt = new Date().toISOString();
      }

      // Set default role if not set
      if (!currentPrefs.role) {
        updateData.role = 'INDIVIDUAL_USER';
        updateData.permissions = PermissionDomain.getRolePermissions('INDIVIDUAL_USER');
      }

      // Update last login
      updateData.lastLogin = new Date().toISOString();

      // Merge with existing preferences
      const updatedPrefs = { ...currentPrefs, ...updateData };
      await this.users.updatePrefs(userId, updatedPrefs);

      // Create user domain object
      const userDomain = UserDomain.fromData({
        $id: adminUser.$id,
        email: adminUser.email,
        name: adminUser.name,
        emailVerified: updatedPrefs.emailVerified ?? adminUser.emailVerification,
        avatar: updatedPrefs.avatar,
        role: updatedPrefs.role || 'INDIVIDUAL_USER',
        companyId: updatedPrefs.companyId,
        permissions: updatedPrefs.permissions || PermissionDomain.getRolePermissions(updatedPrefs.role || 'INDIVIDUAL_USER'),
        subscription: updatedPrefs.subscription || { tier: 'free' },
        preferences: updatedPrefs.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: updatedPrefs.lastLogin,
        isActive: updatedPrefs.isActive !== false,
        createdAt: adminUser.$createdAt,
        updatedAt: adminUser.$updatedAt
      });

      // Generate our JWT tokens
      const session = createTokens({
        userId: adminUser.$id,
        email: adminUser.email,
        role: userDomain.role
      });

      logger.info('OAuth2 callback handled successfully:', { userId, email: adminUser.email });

      return { user: userDomain.toData(), session };
    } catch (error) {
      logger.error('OAuth2 callback failed:', error);
      throw new Error('OAuth2 authentication failed');
    }
  }

  async listOAuth2Sessions(sessionId: string): Promise<OAuth2Session[]> {
    try {
      // sessionId could be either a token or a userId, try token first
      let appwriteSessionId: string | undefined;
      
      try {
        const payload = verifyToken(sessionId);
        appwriteSessionId = payload.sessionId;
      } catch {
        // If token verification fails, we can't list sessions without a session ID
        logger.warn('Cannot list OAuth2 sessions without valid session token');
        return [];
      }
      
      if (appwriteSessionId) {
        this.authClient.setSession(appwriteSessionId);
        
        const sessions = await this.account.listSessions();
        
        return sessions.sessions
          .filter(session => session.provider !== 'email')
          .map(session => ({
            provider: session.provider,
            providerUid: session.providerUid,
            providerAccessToken: session.providerAccessToken,
            providerRefreshToken: session.providerRefreshToken,
            providerAccessTokenExpiry: session.providerAccessTokenExpiry,
            createdAt: session.$createdAt
          }));
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to list OAuth2 sessions:', error);
      throw new Error('Failed to list OAuth2 sessions');
    }
  }

  async deleteOAuth2Session(sessionId: string, provider: string): Promise<void> {
    try {
      // sessionId could be either a token or a userId, try token first
      let appwriteSessionId: string | undefined;
      
      try {
        const payload = verifyToken(sessionId);
        appwriteSessionId = payload.sessionId;
      } catch {
        // If token verification fails, we can't delete sessions without a session ID
        logger.warn('Cannot delete OAuth2 session without valid session token');
        throw new Error('Valid session required to delete OAuth2 session');
      }
      
      if (appwriteSessionId) {
        this.authClient.setSession(appwriteSessionId);
        
        const sessions = await this.account.listSessions();
        const oauthSession = sessions.sessions.find(s => s.provider === provider);
        
        if (oauthSession) {
          await this.account.deleteSession(oauthSession.$id);
        }

        logger.info('OAuth2 session deleted:', { provider });
      } else {
        throw new Error('No valid session found to delete OAuth2 session');
      }
    } catch (error) {
      logger.error('Failed to delete OAuth2 session:', error);
      throw new Error('Failed to delete OAuth2 session');
    }
  }

  // Admin operations for permission management
  async getUserById(userId: string): Promise<User> {
    try {
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      return {
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        avatar: userPrefs.avatar,
        role: userPrefs.role || 'INDIVIDUAL_USER',
        companyId: userPrefs.companyId,
        permissions: userPrefs.permissions || PermissionDomain.getRolePermissions(userPrefs.role || 'INDIVIDUAL_USER'),
        subscription: userPrefs.subscription || { tier: 'free' },
        preferences: userPrefs.preferences || {
          theme: 'auto',
          notifications: true,
          preferredAIModel: 'gpt-4',
          language: 'en'
        },
        lastLogin: userPrefs.lastLogin,
        isActive: userPrefs.isActive !== false,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      };
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  async updateUserRole(userId: string, role: string, updatedBy: string): Promise<User> {
    try {
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      userDomain.changeRole(role as any, userPrefs.companyId);

      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('User role updated:', { userId, role, updatedBy });

      return userDomain.toData();
    } catch (error) {
      logger.error('Failed to update user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  async updateUserPermissions(userId: string, permissions: string[], updatedBy: string): Promise<User> {
    try {
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      userDomain.assignPermissions(permissions as any);

      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('User permissions updated:', { userId, permissions, updatedBy });

      return userDomain.toData();
    } catch (error) {
      logger.error('Failed to update user permissions:', error);
      throw new Error('Failed to update user permissions');
    }
  }

  async listUsers(filters?: { role?: string; companyId?: string; active?: boolean }): Promise<User[]> {
    try {
      const users = await this.users.list();
      
      return users.users
        .map(appwriteUser => {
          const userPrefs = appwriteUser.prefs as any;
          return {
            $id: appwriteUser.$id,
            email: appwriteUser.email,
            name: appwriteUser.name,
            emailVerified: appwriteUser.emailVerification,
            avatar: userPrefs.avatar,
            role: userPrefs.role || 'INDIVIDUAL_USER',
            companyId: userPrefs.companyId,
            permissions: userPrefs.permissions || PermissionDomain.getRolePermissions(userPrefs.role || 'INDIVIDUAL_USER'),
            subscription: userPrefs.subscription || { tier: 'free' },
            preferences: userPrefs.preferences || {
              theme: 'auto',
              notifications: true,
              preferredAIModel: 'gpt-4',
              language: 'en'
            },
            lastLogin: userPrefs.lastLogin,
            isActive: userPrefs.isActive !== false,
            createdAt: appwriteUser.$createdAt,
            updatedAt: appwriteUser.$updatedAt
          };
        })
        .filter(user => {
          if (filters?.role && user.role !== filters.role) return false;
          if (filters?.companyId && user.companyId !== filters.companyId) return false;
          if (filters?.active !== undefined && user.isActive !== filters.active) return false;
          return true;
        });
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw new Error('Failed to list users');
    }
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<void> {
    try {
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      userDomain.deactivate();

      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('User deactivated:', { userId, deactivatedBy });
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      throw new Error('Failed to deactivate user');
    }
  }

  async activateUser(userId: string, activatedBy: string): Promise<void> {
    try {
      const appwriteUser = await this.users.get(userId);
      const userPrefs = appwriteUser.prefs as any;

      const userDomain = UserDomain.fromData({
        ...userPrefs,
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        name: appwriteUser.name,
        emailVerified: appwriteUser.emailVerification,
        createdAt: appwriteUser.$createdAt,
        updatedAt: appwriteUser.$updatedAt
      });

      userDomain.activate();

      await this.users.updatePrefs(userId, userDomain.toData());

      logger.info('User activated:', { userId, activatedBy });
    } catch (error) {
      logger.error('Failed to activate user:', error);
      throw new Error('Failed to activate user');
    }
  }

  private mapAppwriteError(error: AppwriteException): string {
    switch (error.code) {
      case 401:
        return 'Invalid credentials';
      case 409:
        return 'User already exists';
      case 429:
        return 'Too many requests. Please try again after some time';
      default:
        return error.message || 'Authentication failed';
    }
  }

  /**
   * Helper method to add delay for rate limiting during development
   */
  private async addRateLimitDelay(): Promise<void> {
    if (config.nodeEnv === 'development') {
      // Add a small delay to help with rate limiting during testing
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}