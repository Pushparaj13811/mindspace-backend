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