import type { Config } from '../types/index.js';

export const config: Config = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    expireTime: process.env.JWT_EXPIRE_TIME || '1h',
    refreshExpireTime: process.env.JWT_REFRESH_EXPIRE_TIME || '7d',
  },
  
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || '',
    collections: {
      users: process.env.USERS_COLLECTION_ID || 'users',
      companies: process.env.COMPANIES_COLLECTION_ID || 'companies',
      journals: process.env.JOURNALS_COLLECTION_ID || 'journals',
      moods: process.env.MOODS_COLLECTION_ID || 'moods',
      notifications: process.env.NOTIFICATIONS_COLLECTION_ID || 'notifications',
    },
  },
  
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || '',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    allowedAudioTypes: (process.env.ALLOWED_AUDIO_TYPES || 'audio/mpeg,audio/wav,audio/ogg').split(','),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },
  
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:8081').split(','),
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@mindspace.app',
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};

// Validate required environment variables
export const validateConfig = (): void => {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_DATABASE_ID',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('The application will use fallback values, but this is not recommended for production.');
  }
  
  if (config.nodeEnv === 'production') {
    const productionRequired = ['APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY'];
    const missingProd = productionRequired.filter(varName => !process.env[varName]);
    
    if (missingProd.length > 0) {
      throw new Error(`Production requires: ${missingProd.join(', ')}`);
    }
  }
};