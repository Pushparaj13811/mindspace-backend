import type { User, AuthTokens, LoginRequest, RegisterRequest, OAuth2Session, OAuth2Request, OAuth2CallbackRequest } from '../types/index.js';

export interface IAuthService {
  // Authentication methods
  register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }>;
  login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }>;
  logout(sessionId: string): Promise<void>;
  
  // Session management
  validateSession(sessionId: string): Promise<{ user: User; session: AuthTokens }>;
  refreshSession(sessionId: string): Promise<{ user: User; session: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  
  // User management
  getCurrentUser(sessionId: string): Promise<User>;
  updateProfile(sessionId: string, updates: { name?: string; avatar?: string }): Promise<User>;
  updatePreferences(sessionId: string, preferences: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    preferredAIModel?: string;
    language?: string;
  }): Promise<User>;
  
  // Password management
  changePassword(sessionId: string, currentPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  confirmPasswordReset(secret: string, password: string): Promise<void>;
  
  // Account management
  deleteAccount(sessionId: string, password: string): Promise<void>;
  
  // Email verification
  createEmailVerification(sessionId: string): Promise<void>;
  confirmEmailVerification(userId: string, secret: string): Promise<void>;
  
  // OAuth2 methods
  createOAuth2Session(provider: string, successUrl?: string, failureUrl?: string): Promise<string>;
  handleOAuth2Callback(userId: string, secret: string): Promise<{ user: User; session: AuthTokens }>;
  listOAuth2Sessions(sessionId: string): Promise<OAuth2Session[]>;
  deleteOAuth2Session(sessionId: string, provider: string): Promise<void>;
}