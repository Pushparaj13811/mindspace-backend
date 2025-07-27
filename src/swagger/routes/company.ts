export const companyPaths = {
  '/api/v1/companies': {
    post: {
      tags: ['Company'],
      summary: 'Create a new company',
      description: 'Create a new company (Super admin only)',
      operationId: 'createCompany',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateCompanyRequest' }
          }
        }
      },
      responses: {
        '201': {
          description: 'Company created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      company: { $ref: '#/components/schemas/Company' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Company created successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    },
    get: {
      tags: ['Company'],
      summary: 'List all companies',
      description: 'Get a paginated list of all companies (Super admin only)',
      operationId: 'listCompanies',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' as const, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 100 } }
      ],
      responses: {
        '200': {
          description: 'Companies retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const },
                  data: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/Company' }
                  },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },
  '/api/v1/companies/{companyId}': {
    get: {
      tags: ['Company'],
      summary: 'Get company details',
      description: 'Retrieve detailed information about a specific company',
      operationId: 'getCompany',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Company details retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      company: { $ref: '#/components/schemas/Company' }
                    }
                  },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    patch: {
      tags: ['Company'],
      summary: 'Update company',
      description: 'Update company information and settings',
      operationId: 'updateCompany',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateCompanyRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Company updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      company: { $ref: '#/components/schemas/Company' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Company updated successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Company', 'Admin'],
      summary: 'Delete company',
      description: 'Permanently delete a company and all associated data. Super admin only.',
      operationId: 'deleteCompany',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Company deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/api/v1/companies/{companyId}/invite': {
    post: {
      tags: ['Company'],
      summary: 'Invite user to company',
      description: 'Send an invitation email to a user to join the company with specified role',
      operationId: 'inviteUser',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InviteUserRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Invitation sent successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },
  '/api/v1/companies/{companyId}/users': {
    get: {
      tags: ['Company'],
      summary: 'Get company users',
      description: 'Retrieve a list of users belonging to the company with pagination',
      operationId: 'getCompanyUsers',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } },
        { name: 'page', in: 'query', schema: { type: 'integer' as const, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 100 } }
      ],
      responses: {
        '200': {
          description: 'Company users retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const },
                  data: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/User' }
                  },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/api/v1/companies/{companyId}/analytics': {
    get: {
      tags: ['Company', 'Analytics'],
      summary: 'Get company analytics',
      description: 'Retrieve analytics and metrics for the company including user activity, wellness trends, and usage statistics',
      operationId: 'getCompanyAnalytics',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' as const } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'period', in: 'query', schema: { type: 'string' as const, enum: ['7d', '30d', '90d', '1y'] } }
      ],
      responses: {
        '200': {
          description: 'Company analytics retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/CompanyAnalytics' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/api/v1/companies/platform/analytics': {
    get: {
      tags: ['Admin', 'Analytics'],
      summary: 'Get platform analytics',
      description: 'Retrieve platform-wide analytics including all companies, revenue metrics, and usage statistics. Super admin only.',
      operationId: 'getPlatformAnalytics',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'dateFrom', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'period', in: 'query', schema: { type: 'string' as const, enum: ['7d', '30d', '90d', '1y'] } }
      ],
      responses: {
        '200': {
          description: 'Platform analytics retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/PlatformAnalytics' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' }
      }
    }
  },
  '/api/v1/companies/invite/{inviteToken}/accept': {
    post: {
      tags: ['Company'],
      summary: 'Accept company invitation',
      description: 'Accept a company invitation using the invite token. Creates a new user account and associates it with the company.',
      operationId: 'acceptInvite',
      parameters: [
        { name: 'inviteToken', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AcceptInviteRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Invitation accepted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  }
};