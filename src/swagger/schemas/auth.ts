export const authSchemas = {
  AuthTokens: {
    type: 'object' as const,
    properties: {
      accessToken: {
        type: 'string' as const,
        description: 'JWT access token for API authentication',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      },
      refreshToken: {
        type: 'string' as const,
        description: 'Refresh token for obtaining new access tokens',
        example: 'refresh_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      },
      expiresIn: {
        type: 'number' as const,
        description: 'Access token expiration time in seconds',
        example: 3600
      }
    },
    required: ['accessToken', 'refreshToken', 'expiresIn']
  },
  LoginRequest: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string' as const,
        format: 'email',
        description: 'User email address',
        example: 'user@example.com'
      },
      password: {
        type: 'string' as const,
        description: 'User password',
        example: 'SecurePassword123!'
      }
    },
    required: ['email', 'password']
  },
  RegisterRequest: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string' as const,
        format: 'email',
        description: 'User email address',
        example: 'newuser@example.com'
      },
      password: {
        type: 'string' as const,
        minLength: 8,
        description: 'User password (minimum 8 characters, must contain uppercase, lowercase, and number)',
        example: 'SecurePassword123!'
      },
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'User full name',
        example: 'John Doe'
      },
      phoneNumber: {
        type: 'string' as const,
        pattern: '^[\\+]?[1-9][\\d]{0,15}$',
        description: 'Optional phone number in international format',
        example: '+1234567890'
      }
    },
    required: ['email', 'password', 'name']
  },
  RefreshTokenRequest: {
    type: 'object' as const,
    properties: {
      refreshToken: {
        type: 'string' as const,
        description: 'Refresh token obtained from login',
        example: 'refresh_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    },
    required: ['refreshToken']
  },
  PasswordResetRequest: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string' as const,
        format: 'email',
        description: 'Email address to send reset link',
        example: 'user@example.com'
      }
    },
    required: ['email']
  },
  PasswordResetConfirmRequest: {
    type: 'object' as const,
    properties: {
      token: {
        type: 'string' as const,
        description: 'Reset token from email',
        example: 'reset_token_123456'
      },
      password: {
        type: 'string' as const,
        minLength: 8,
        description: 'New password',
        example: 'NewSecurePassword123!'
      }
    },
    required: ['token', 'password']
  },
  ChangePasswordRequest: {
    type: 'object' as const,
    properties: {
      currentPassword: {
        type: 'string' as const,
        description: 'Current password',
        example: 'CurrentPassword123!'
      },
      newPassword: {
        type: 'string' as const,
        minLength: 8,
        description: 'New password',
        example: 'NewSecurePassword123!'
      }
    },
    required: ['currentPassword', 'newPassword']
  },
  OAuth2InitiateRequest: {
    type: 'object' as const,
    properties: {
      provider: {
        type: 'string' as const,
        enum: ['google'],
        description: 'OAuth2 provider',
        example: 'google'
      },
      successUrl: {
        type: 'string' as const,
        format: 'uri',
        description: 'URL to redirect on success',
        example: 'https://myapp.com/auth/success'
      },
      failureUrl: {
        type: 'string' as const,
        format: 'uri',
        description: 'URL to redirect on failure',
        example: 'https://myapp.com/auth/error'
      }
    },
    required: ['provider']
  },
  AuthResponse: {
    type: 'object' as const,
    properties: {
      success: {
        type: 'boolean' as const,
        example: true
      },
      data: {
        type: 'object' as const,
        properties: {
          user: {
            $ref: '#/components/schemas/User'
          },
          session: {
            $ref: '#/components/schemas/AuthTokens'
          }
        }
      },
      message: {
        type: 'string' as const,
        example: 'Login successful'
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z'
      }
    }
  }
};