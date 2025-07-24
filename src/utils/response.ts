import type { APIResponse, PaginatedResponse } from '../types/index.js';

export class ResponseBuilder {
  static success<T>(data: T, message?: string): APIResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static error(error: string, message?: string): APIResponse {
    return {
      success: false,
      error,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
  ACCOUNT_EXISTS: 'Account already exists with this email',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_WEAK: 'Password must be at least 8 characters long',
  
  // Resources
  USER_NOT_FOUND: 'User not found',
  JOURNAL_NOT_FOUND: 'Journal entry not found',
  MOOD_NOT_FOUND: 'Mood entry not found',
  FILE_NOT_FOUND: 'File not found',
  
  // Permissions
  ACCESS_DENIED: 'Access denied to this resource',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  
  // Server
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  DATABASE_ERROR: 'Database operation failed',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  
  // File upload
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  UPLOAD_FAILED: 'File upload failed',
  
  // AI
  AI_SERVICE_ERROR: 'AI service is currently unavailable',
  AI_QUOTA_EXCEEDED: 'AI usage quota exceeded',
  INVALID_AI_REQUEST: 'Invalid AI request parameters',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Account created successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  
  // Resources
  JOURNAL_CREATED: 'Journal entry created successfully',
  JOURNAL_UPDATED: 'Journal entry updated successfully',
  JOURNAL_DELETED: 'Journal entry deleted successfully',
  MOOD_LOGGED: 'Mood logged successfully',
  MOOD_UPDATED: 'Mood updated successfully',
  
  // Profile
  PROFILE_UPDATED: 'Profile updated successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully',
  
  // Files
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully',
  
  // AI
  AI_ANALYSIS_COMPLETE: 'AI analysis completed successfully',
} as const;

// Helper function to create error response with status
export const createErrorResponse = (status: number, error: string, message?: string) => {
  return new Response(
    JSON.stringify(ResponseBuilder.error(error, message)),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

// Helper function to create success response with status
export const createSuccessResponse = <T>(
  status: number,
  data: T,
  message?: string
) => {
  return new Response(
    JSON.stringify(ResponseBuilder.success(data, message)),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};