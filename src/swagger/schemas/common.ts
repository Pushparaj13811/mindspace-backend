export const commonSchemas = {
  SuccessResponse: {
    type: 'object' as const,
    properties: {
      success: {
        type: 'boolean' as const,
        enum: [true],
        description: 'Success indicator',
        example: true
      },
      data: {
        type: 'object' as const,
        description: 'Response data - structure varies by endpoint'
      },
      message: {
        type: 'string' as const,
        description: 'Success message',
        example: 'Operation completed successfully'
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Response timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['success', 'timestamp']
  },
  ErrorResponse: {
    type: 'object' as const,
    properties: {
      success: {
        type: 'boolean' as const,
        enum: [false],
        description: 'Success indicator',
        example: false
      },
      error: {
        type: 'string' as const,
        description: 'Error message',
        example: 'Invalid credentials'
      },
      message: {
        type: 'string' as const,
        description: 'Additional error context',
        example: 'The provided email or password is incorrect'
      },
      code: {
        type: 'string' as const,
        description: 'Error code for programmatic handling',
        example: 'INVALID_CREDENTIALS'
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Response timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['success', 'error', 'timestamp']
  },
  PaginatedResponse: {
    type: 'object' as const,
    properties: {
      success: {
        type: 'boolean' as const,
        enum: [true],
        description: 'Success indicator',
        example: true
      },
      data: {
        type: 'array' as const,
        items: {
          type: 'object' as const
        },
        description: 'Array of data items'
      },
      message: {
        type: 'string' as const,
        description: 'Success message',
        example: 'Data retrieved successfully'
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Response timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      pagination: {
        type: 'object' as const,
        properties: {
          total: {
            type: 'number' as const,
            description: 'Total number of items',
            example: 150
          },
          page: {
            type: 'number' as const,
            description: 'Current page number',
            example: 1
          },
          limit: {
            type: 'number' as const,
            description: 'Items per page',
            example: 20
          },
          hasNext: {
            type: 'boolean' as const,
            description: 'Whether there are more pages',
            example: true
          },
          hasPrev: {
            type: 'boolean' as const,
            description: 'Whether there are previous pages',
            example: false
          }
        },
        required: ['total', 'page', 'limit', 'hasNext', 'hasPrev']
      }
    },
    required: ['success', 'data', 'timestamp', 'pagination']
  },
  PaginationQuery: {
    type: 'object' as const,
    properties: {
      page: {
        type: 'number' as const,
        minimum: 1,
        description: 'Page number',
        example: 1
      },
      limit: {
        type: 'number' as const,
        minimum: 1,
        maximum: 100,
        description: 'Items per page',
        example: 20
      },
      sortBy: {
        type: 'string' as const,
        description: 'Field to sort by',
        example: 'createdAt'
      },
      sortOrder: {
        type: 'string' as const,
        enum: ['asc', 'desc'],
        description: 'Sort order',
        example: 'desc'
      }
    }
  },
  DateRangeQuery: {
    type: 'object' as const,
    properties: {
      dateFrom: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Start date for filtering',
        example: '2024-01-01T00:00:00.000Z'
      },
      dateTo: {
        type: 'string' as const,
        format: 'date-time',
        description: 'End date for filtering',
        example: '2024-01-31T23:59:59.999Z'
      }
    }
  },
  IdParam: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string' as const,
        description: 'Resource identifier',
        example: '64f1a2b3c4d5e6f7g8h9i0j1'
      }
    },
    required: ['id']
  },
  HealthResponse: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string' as const,
        enum: ['ok', 'degraded', 'down'],
        description: 'Overall health status',
        example: 'ok'
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Health check timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      version: {
        type: 'string' as const,
        description: 'API version',
        example: '1.0.0'
      },
      services: {
        type: 'object' as const,
        properties: {
          total: {
            type: 'number' as const,
            description: 'Total number of services',
            example: 10
          },
          healthy: {
            type: 'number' as const,
            description: 'Number of healthy services',
            example: 10
          },
          unhealthy: {
            type: 'number' as const,
            description: 'Number of unhealthy services',
            example: 0
          },
          details: {
            type: 'object' as const,
            additionalProperties: {
              type: 'object' as const,
              properties: {
                healthy: {
                  type: 'boolean' as const,
                  example: true
                },
                message: {
                  type: 'string' as const,
                  example: 'Service is operational'
                }
              }
            }
          }
        }
      }
    }
  }
};