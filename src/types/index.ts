// Core type definitions for MindSpace Backend

// Role and Permission System
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_MANAGER' | 'COMPANY_USER' | 'INDIVIDUAL_USER';

export type Permission = 
  // Platform permissions
  'manage_platform' | 'view_platform_analytics' | 'manage_companies' | 'manage_super_admins' |
  // Company permissions  
  'manage_company' | 'view_company_analytics' | 'manage_company_users' | 'manage_departments' |
  // User permissions
  'manage_profile' | 'create_journal' | 'view_own_data' | 'delete_account' | 'view_company_data';

export interface Company {
  $id: string;
  name: string;
  domain: string; // email domain for auto-assignment
  logo?: string;
  adminId: string; // Company admin user ID
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    dataRetentionDays: number;
  };
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    validUntil?: string;
    maxUsers: number;
    currentUsers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  $id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  
  // Role and Company Association
  role: UserRole;
  companyId?: string; // null for INDIVIDUAL_USER and SUPER_ADMIN
  permissions: Permission[];
  
  // Legacy subscription (for individual users)
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    validUntil?: string;
  };
  
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    preferredAIModel: string;
    language: string;
    interests?: string[];
  };
  
  // Metadata
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoodState {
  current: 'happy' | 'sad' | 'anxious' | 'calm' | 'energetic' | 'depressed';
  intensity: number; // 1-10
  timestamp: string;
  triggers?: string[];
  notes?: string;
}

export interface MoodEntry {
  $id: string;
  userId: string;
  mood: MoodState;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  $id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodState;
  tags: string[];
  aiInsights?: {
    sentiment: number;
    emotions: string[];
    themes: string[];
    suggestions: string[];
  };
  attachments: {
    images: string[];
    voiceRecording?: string;
  };
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AIRequest {
  prompt: string;
  model?: 'gpt-4' | 'claude-3' | 'gemini-pro';
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  response: string;
  model: string;
  tokensUsed: number;
  cost: number;
  timestamp: string;
}

export interface FileUpload {
  $id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledFor?: string;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface OAuth2Session {
  provider: string;
  providerUid: string;
  providerAccessToken: string;
  providerRefreshToken?: string;
  providerAccessTokenExpiry: string;
  createdAt: string;
}

export interface OAuth2Request {
  provider: 'google';
  successUrl?: string;
  failureUrl?: string;
}

export interface OAuth2CallbackRequest {
  userId: string;
  secret: string;
}

export interface CreateJournalRequest {
  title: string;
  content: string;
  mood: MoodState;
  tags?: string[];
  attachments?: {
    images?: string[];
    voiceRecording?: string;
  };
}

export interface UpdateJournalRequest {
  title?: string;
  content?: string;
  mood?: MoodState;
  tags?: string[];
}

export interface MoodLogRequest {
  current: MoodState['current'];
  intensity: number;
  triggers?: string[];
  notes?: string;
}

// Environment configuration
export interface Config {
  port: number;
  nodeEnv: string;
  apiVersion: string;
  jwt: {
    secret: string;
    refreshSecret: string;
    expireTime: string;
    refreshExpireTime: string;
  };
  appwrite: {
    endpoint: string;
    projectId: string;
    apiKey: string;
    databaseId: string;
    collections: {
      users: string;
      companies: string;
      journals: string;
      moods: string;
      notifications: string;
    };
  };
  ai: {
    openaiKey: string;
    anthropicKey: string;
    geminiKey: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  upload: {
    maxFileSize: number;
    allowedImageTypes: string[];
    allowedAudioTypes: string[];
  };
  logging: {
    level: string;
    filePath: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  app: {
    frontendUrl: string;
  };
}

// Company Management Types
export interface CreateCompanyRequest {
  name: string;
  domain: string;
  settings?: {
    allowSelfRegistration?: boolean;
    requireEmailVerification?: boolean;
    dataRetentionDays?: number;
  };
}

export interface UpdateCompanyRequest {
  name?: string;
  domain?: string;
  logo?: string;
  settings?: {
    allowSelfRegistration?: boolean;
    requireEmailVerification?: boolean;
    dataRetentionDays?: number;
  };
}

export interface CompanyUserInvite {
  email: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_MANAGER' | 'COMPANY_USER';
  name?: string;
}

export interface CompanyAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  journalEntries: number;
  moodLogs: number;
  subscriptionTier: string;
  usageMetrics: {
    dailyActiveUsers: number[];
    weeklyJournalEntries: number[];
    monthlyMoodLogs: number[];
  };
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  subscriptionDistribution: {
    free: number;
    premium: number;
    enterprise: number;
  };
  revenueMetrics: {
    monthlyRecurringRevenue: number;
    totalRevenue: number;
    averageRevenuePerUser: number;
  };
}

// Export validation types
export type { 
  LoginInput, 
  RegisterInput,
  CreateJournalInput,
  UpdateJournalInput,
  JournalQueryInput,
  AIRequestInput,
  UpdateProfileInput,
  UpdatePreferencesInput,
  OAuth2RequestInput,
  OAuth2CallbackInput,
  MoodLogInput,
  MoodQueryInput
} from '../utils/validation.js';