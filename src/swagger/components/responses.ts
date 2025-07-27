export const responses = {
  BadRequest: {
    description: 'Bad Request - Invalid input data',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Validation Error',
          message: 'The provided input data is invalid',
          code: 'VALIDATION_ERROR',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  Unauthorized: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Unauthorized access',
          message: 'Valid authentication token is required',
          code: 'UNAUTHORIZED',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  Forbidden: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Access denied to this resource',
          message: 'Your role does not have permission to access this resource',
          code: 'INSUFFICIENT_PERMISSIONS',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  NotFound: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Resource not found',
          message: 'The requested resource could not be found',
          code: 'NOT_FOUND',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  Conflict: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Account already exists with this email',
          message: 'A user with this email address already exists',
          code: 'ACCOUNT_EXISTS',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  RateLimited: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Too many requests, please try again later',
          message: 'Rate limit exceeded for your current subscription tier',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  InternalServerError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred while processing your request',
          code: 'INTERNAL_ERROR',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  },
  ServiceUnavailable: {
    description: 'Service Unavailable',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          success: false,
          error: 'Service temporarily unavailable',
          message: 'The service is currently undergoing maintenance',
          code: 'SERVICE_UNAVAILABLE',
          timestamp: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  }
};