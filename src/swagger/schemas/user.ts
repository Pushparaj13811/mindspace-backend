export const userSchemas = {
  User: {
    type: 'object' as const,
    properties: {
      $id: {
        type: 'string' as const,
        description: 'Unique user identifier',
        example: '64f1a2b3c4d5e6f7g8h9i0j1'
      },
      email: {
        type: 'string' as const,
        format: 'email',
        description: 'User email address',
        example: 'user@example.com'
      },
      name: {
        type: 'string' as const,
        description: 'User display name',
        example: 'John Doe'
      },
      avatar: {
        type: 'string' as const,
        format: 'uri',
        description: 'User avatar URL',
        nullable: true,
        example: 'https://example.com/avatar.jpg'
      },
      emailVerified: {
        type: 'boolean' as const,
        description: 'Whether the user email is verified',
        example: true
      },
      emailVerifiedAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Email verification timestamp',
        nullable: true,
        example: '2024-01-15T10:30:00.000Z'
      },
      role: {
        type: 'string' as const,
        enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER', 'INDIVIDUAL_USER'],
        description: 'User role in the system',
        example: 'INDIVIDUAL_USER'
      },
      companyId: {
        type: 'string' as const,
        description: 'Company ID (null for individual users and super admins)',
        nullable: true,
        example: 'company_12345'
      },
      permissions: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          enum: [
            'manage_platform', 'view_platform_analytics', 'manage_companies', 'manage_super_admins',
            'manage_company', 'view_company_analytics', 'manage_company_users', 'manage_departments',
            'manage_profile', 'create_journal', 'view_own_data', 'delete_account', 'view_company_data',
            'use_ai_features'
          ]
        },
        description: 'List of permissions granted to the user',
        example: ['manage_profile', 'create_journal', 'view_own_data']
      },
      subscription: {
        type: 'object' as const,
        properties: {
          tier: {
            type: 'string' as const,
            enum: ['free', 'premium', 'enterprise'],
            description: 'User subscription tier',
            example: 'free'
          },
          validUntil: {
            type: 'string' as const,
            format: 'date-time',
            description: 'Subscription expiration date',
            nullable: true,
            example: '2024-12-31T23:59:59.000Z'
          }
        }
      },
      preferences: {
        type: 'object' as const,
        properties: {
          theme: {
            type: 'string' as const,
            enum: ['light', 'dark', 'auto'],
            description: 'User interface theme preference',
            example: 'dark'
          },
          notifications: {
            type: 'boolean' as const,
            description: 'Whether notifications are enabled',
            example: true
          },
          preferredAIModel: {
            type: 'string' as const,
            description: 'Preferred AI model for analysis',
            example: 'gpt-4'
          },
          language: {
            type: 'string' as const,
            description: 'User interface language',
            example: 'en'
          },
          interests: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'User interests for content personalization',
            example: ['mindfulness', 'productivity', 'wellness']
          }
        }
      },
      lastLogin: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Last login timestamp',
        nullable: true,
        example: '2024-01-15T09:30:00.000Z'
      },
      isActive: {
        type: 'boolean' as const,
        description: 'Whether the user account is active',
        example: true
      },
      onboardingCompleted: {
        type: 'boolean' as const,
        description: 'Whether the user has completed onboarding',
        example: true
      },
      createdAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Account creation timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      updatedAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Last account update timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['$id', 'email', 'name', 'emailVerified', 'role', 'permissions', 'subscription', 'preferences', 'isActive', 'onboardingCompleted', 'createdAt', 'updatedAt']
  },
  UpdateProfileRequest: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'User full name',
        example: 'John Doe'
      },
      avatar: {
        type: 'string' as const,
        format: 'uri',
        description: 'Avatar image URL',
        example: 'https://example.com/avatar.jpg'
      },
      onboardingCompleted: {
        type: 'boolean' as const,
        description: 'Whether user has completed onboarding',
        example: true
      }
    }
  },
  UpdatePreferencesRequest: {
    type: 'object' as const,
    properties: {
      theme: {
        type: 'string' as const,
        enum: ['light', 'dark', 'auto'],
        description: 'UI theme preference',
        example: 'dark'
      },
      notifications: {
        type: 'boolean' as const,
        description: 'Enable/disable notifications',
        example: true
      },
      preferredAIModel: {
        type: 'string' as const,
        maxLength: 50,
        description: 'Preferred AI model',
        example: 'gpt-4'
      },
      language: {
        type: 'string' as const,
        maxLength: 10,
        description: 'UI language',
        example: 'en'
      }
    }
  }
};