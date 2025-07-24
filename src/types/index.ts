// Core type definitions for MindSpace Backend
export interface User {
  $id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: {
    tier: 'free' | 'premium' | 'enterprise';
    validUntil?: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    preferredAIModel: string;
    language: string;
  };
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