export const companySchemas = {
  Company: {
    type: 'object' as const,
    properties: {
      $id: {
        type: 'string' as const,
        description: 'Unique company identifier',
        example: 'company_64f1a2b3c4d5e6f7g8h9i0j1'
      },
      name: {
        type: 'string' as const,
        description: 'Company name',
        example: 'Acme Corporation'
      },
      domain: {
        type: 'string' as const,
        description: 'Email domain for auto-assignment',
        example: 'acme.com'
      },
      logo: {
        type: 'string' as const,
        format: 'uri',
        description: 'Company logo URL',
        example: 'https://example.com/logo.png'
      },
      adminId: {
        type: 'string' as const,
        description: 'Company admin user ID',
        example: '64f1a2b3c4d5e6f7g8h9i0j1'
      },
      settings: {
        type: 'object' as const,
        properties: {
          allowSelfRegistration: {
            type: 'boolean' as const,
            description: 'Whether users can self-register',
            example: true
          },
          requireEmailVerification: {
            type: 'boolean' as const,
            description: 'Whether email verification is required',
            example: true
          },
          dataRetentionDays: {
            type: 'number' as const,
            description: 'Data retention period in days',
            example: 365
          }
        }
      },
      subscription: {
        type: 'object' as const,
        properties: {
          tier: {
            type: 'string' as const,
            enum: ['free', 'premium', 'enterprise'],
            description: 'Company subscription tier',
            example: 'premium'
          },
          validUntil: {
            type: 'string' as const,
            format: 'date-time',
            description: 'Subscription expiration date',
            example: '2024-12-31T23:59:59.000Z'
          },
          maxUsers: {
            type: 'number' as const,
            description: 'Maximum allowed users',
            example: 100
          },
          currentUsers: {
            type: 'number' as const,
            description: 'Current number of users',
            example: 45
          }
        }
      },
      createdAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Company creation timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      updatedAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Company last update timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['$id', 'name', 'domain', 'adminId', 'settings', 'subscription', 'createdAt', 'updatedAt']
  },
  CreateCompanyRequest: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'Company name',
        example: 'Acme Corporation'
      },
      domain: {
        type: 'string' as const,
        description: 'Email domain (extracted from email format)',
        example: 'acme.com'
      },
      settings: {
        type: 'object' as const,
        properties: {
          allowSelfRegistration: {
            type: 'boolean' as const,
            description: 'Allow users to self-register'
          },
          requireEmailVerification: {
            type: 'boolean' as const,
            description: 'Require email verification'
          },
          dataRetentionDays: {
            type: 'number' as const,
            minimum: 30,
            maximum: 2555,
            description: 'Data retention period in days'
          }
        }
      }
    },
    required: ['name', 'domain']
  },
  UpdateCompanyRequest: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'Company name'
      },
      domain: {
        type: 'string' as const,
        description: 'Email domain'
      },
      logo: {
        type: 'string' as const,
        format: 'uri',
        description: 'Company logo URL'
      },
      settings: {
        type: 'object' as const,
        properties: {
          allowSelfRegistration: {
            type: 'boolean' as const,
            description: 'Allow users to self-register'
          },
          requireEmailVerification: {
            type: 'boolean' as const,
            description: 'Require email verification'
          },
          dataRetentionDays: {
            type: 'number' as const,
            minimum: 30,
            maximum: 2555,
            description: 'Data retention period in days'
          }
        }
      }
    }
  },
  InviteUserRequest: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string' as const,
        format: 'email',
        description: 'Email address to invite',
        example: 'newuser@example.com'
      },
      role: {
        type: 'string' as const,
        enum: ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'],
        description: 'Role to assign to the user',
        example: 'COMPANY_USER'
      },
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'Optional user name',
        example: 'John Doe'
      }
    },
    required: ['email', 'role']
  },
  UpdateUserRoleRequest: {
    type: 'object' as const,
    properties: {
      role: {
        type: 'string' as const,
        enum: ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER'],
        description: 'New role for the user',
        example: 'COMPANY_MANAGER'
      }
    },
    required: ['role']
  },
  AcceptInviteRequest: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        description: 'User full name',
        example: 'John Doe'
      },
      password: {
        type: 'string' as const,
        minLength: 8,
        description: 'User password',
        example: 'SecurePassword123!'
      }
    },
    required: ['name', 'password']
  },
  CompanyAnalytics: {
    type: 'object' as const,
    properties: {
      totalUsers: {
        type: 'number' as const,
        description: 'Total number of users',
        example: 45
      },
      activeUsers: {
        type: 'number' as const,
        description: 'Number of active users',
        example: 38
      },
      newUsersThisMonth: {
        type: 'number' as const,
        description: 'New users added this month',
        example: 5
      },
      journalEntries: {
        type: 'number' as const,
        description: 'Total journal entries',
        example: 1250
      },
      moodLogs: {
        type: 'number' as const,
        description: 'Total mood logs',
        example: 3420
      },
      subscriptionTier: {
        type: 'string' as const,
        description: 'Current subscription tier',
        example: 'premium'
      },
      usageMetrics: {
        type: 'object' as const,
        properties: {
          dailyActiveUsers: {
            type: 'array' as const,
            items: {
              type: 'number' as const
            },
            description: 'Daily active users for the period'
          },
          weeklyJournalEntries: {
            type: 'array' as const,
            items: {
              type: 'number' as const
            },
            description: 'Weekly journal entries'
          },
          monthlyMoodLogs: {
            type: 'array' as const,
            items: {
              type: 'number' as const
            },
            description: 'Monthly mood logs'
          }
        }
      }
    }
  },
  PlatformAnalytics: {
    type: 'object' as const,
    properties: {
      totalUsers: {
        type: 'number' as const,
        description: 'Total platform users',
        example: 5420
      },
      totalCompanies: {
        type: 'number' as const,
        description: 'Total companies',
        example: 42
      },
      activeCompanies: {
        type: 'number' as const,
        description: 'Active companies',
        example: 38
      },
      subscriptionDistribution: {
        type: 'object' as const,
        properties: {
          free: {
            type: 'number' as const,
            example: 15
          },
          premium: {
            type: 'number' as const,
            example: 20
          },
          enterprise: {
            type: 'number' as const,
            example: 7
          }
        }
      },
      revenueMetrics: {
        type: 'object' as const,
        properties: {
          monthlyRecurringRevenue: {
            type: 'number' as const,
            description: 'MRR in USD',
            example: 125000
          },
          totalRevenue: {
            type: 'number' as const,
            description: 'Total revenue in USD',
            example: 1500000
          },
          averageRevenuePerUser: {
            type: 'number' as const,
            description: 'ARPU in USD',
            example: 23.15
          }
        }
      }
    }
  }
};