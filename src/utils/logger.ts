import winston from 'winston';
import { config } from './config.js';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'mindspace-backend',
    environment: config.nodeEnv
  },
  transports: [
    // Write to file
    new winston.transports.File({
      filename: config.logging.filePath.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: config.logging.filePath,
      maxsize: 5242880, // 5MB  
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper functions for common log patterns
export const logApi = {
  request: (method: string, path: string, userId?: string) => {
    logger.info('API Request', {
      method,
      path,
      userId,
      type: 'api_request'
    });
  },
  
  response: (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
    logger.info('API Response', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
      type: 'api_response'
    });
  },
  
  error: (method: string, path: string, error: Error, userId?: string) => {
    logger.error('API Error', {
      method,
      path,
      error: error.message,
      stack: error.stack,
      userId,
      type: 'api_error'
    });
  }
};

export const logAuth = {
  login: (email: string, success: boolean, reason?: string) => {
    logger.info('Login Attempt', {
      email,
      success,
      reason,
      type: 'auth_login'
    });
  },
  
  register: (email: string, success: boolean, reason?: string) => {
    logger.info('Registration Attempt', {
      email,
      success,
      reason,
      type: 'auth_register'
    });
  },
  
  tokenRefresh: (userId: string, success: boolean) => {
    logger.info('Token Refresh', {
      userId,
      success,
      type: 'auth_refresh'
    });
  }
};

export const logOAuth2 = {
  initiate: (provider: string, successUrl?: string, failureUrl?: string, metadata?: Record<string, any>) => {
    logger.info('OAuth2 Initiation', {
      provider,
      successUrl,
      failureUrl,
      timestamp: new Date().toISOString(),
      type: 'oauth2_initiate',
      ...metadata
    });
  },
  
  redirectCreated: (provider: string, redirectUrl: string, metadata?: Record<string, any>) => {
    logger.info('OAuth2 Redirect Created', {
      provider,
      redirectUrl,
      timestamp: new Date().toISOString(),
      type: 'oauth2_redirect_created',
      ...metadata
    });
  },
  
  callbackReceived: (provider: string, userId?: string, metadata?: Record<string, any>) => {
    logger.info('OAuth2 Callback Received', {
      provider,
      userId,
      timestamp: new Date().toISOString(),
      type: 'oauth2_callback_received',
      ...metadata
    });
  },
  
  success: (provider: string, userId: string, email: string, metadata?: Record<string, any>) => {
    logger.info('OAuth2 Authentication Success', {
      provider,
      userId,
      email,
      timestamp: new Date().toISOString(),
      type: 'oauth2_success',
      ...metadata
    });
  },
  
  failure: (provider: string, error: string, userId?: string, metadata?: Record<string, any>) => {
    logger.error('OAuth2 Authentication Failure', {
      provider,
      error,
      userId,
      timestamp: new Date().toISOString(),
      type: 'oauth2_failure',
      ...metadata
    });
  },
  
  sessionManagement: (action: 'list' | 'delete', provider: string, userId?: string, sessionCount?: number, metadata?: Record<string, any>) => {
    logger.info('OAuth2 Session Management', {
      action,
      provider,
      userId,
      sessionCount,
      timestamp: new Date().toISOString(),
      type: 'oauth2_session_management',
      ...metadata
    });
  },
  
  securityEvent: (event: string, provider: string, userId?: string, severity: 'low' | 'medium' | 'high' = 'medium', metadata?: Record<string, any>) => {
    const logLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    logger[logLevel]('OAuth2 Security Event', {
      event,
      provider,
      userId,
      severity,
      timestamp: new Date().toISOString(),
      type: 'oauth2_security_event',
      ...metadata
    });
  },
  
  providerError: (provider: string, errorType: string, error: string, userId?: string, metadata?: Record<string, any>) => {
    logger.error('OAuth2 Provider Error', {
      provider,
      errorType,
      error,
      userId,
      timestamp: new Date().toISOString(),
      type: 'oauth2_provider_error',
      ...metadata
    });
  },
  
  configurationIssue: (provider: string, issue: string, metadata?: Record<string, any>) => {
    logger.error('OAuth2 Configuration Issue', {
      provider,
      issue,
      timestamp: new Date().toISOString(),
      type: 'oauth2_configuration_issue',
      ...metadata
    });
  }
};

export const logAI = {
  request: (model: string, prompt: string, userId: string) => {
    logger.info('AI Request', {
      model,
      promptLength: prompt.length,
      userId,
      type: 'ai_request'
    });
  },
  
  response: (model: string, tokensUsed: number, cost: number, userId: string) => {
    logger.info('AI Response', {
      model,
      tokensUsed,
      cost,
      userId,
      type: 'ai_response'
    });
  },
  
  error: (model: string, error: Error, userId: string) => {
    logger.error('AI Error', {
      model,
      error: error.message,
      userId,
      type: 'ai_error'
    });
  }
};

export default logger;