/**
 * Custom error classes for better error handling and proper HTTP status codes
 */

export class BusinessError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 400, code || 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 401, code || 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 403, code || 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 404, code || 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 409, code || 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 429, code || 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends BusinessError {
  constructor(message: string, code?: string) {
    super(message, 503, code || 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Factory functions for common business errors
 */
export const createInvalidCredentialsError = () => 
  new AuthenticationError('Invalid credentials');

export const createUserNotFoundError = (userId?: string) => 
  new NotFoundError(userId ? `User not found: ${userId}` : 'User not found');

export const createUserExistsError = (email?: string) => 
  new ConflictError(email ? `User already exists with email: ${email}` : 'User already exists');

export const createAccessDeniedError = (resource?: string) => 
  new AuthorizationError(resource ? `Access denied to ${resource}` : 'Access denied');

export const createValidationError = (field?: string) => 
  new ValidationError(field ? `Validation failed for field: ${field}` : 'Validation failed');

export const createRateLimitError = () => 
  new RateLimitError('Too many requests. Please try again later.');

/**
 * Type guard to check if error is a BusinessError
 */
export const isBusinessError = (error: any): error is BusinessError => {
  return error instanceof BusinessError;
};

/**
 * Helper to extract error info for logging
 */
export const getErrorInfo = (error: any) => {
  if (isBusinessError(error)) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      isBusinessError: true
    };
  }
  
  return {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    statusCode: 500,
    isBusinessError: false,
    stack: error.stack
  };
};