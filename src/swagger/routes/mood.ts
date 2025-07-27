export const moodPaths = {
  '/api/v1/mood': {
    post: {
      tags: ['Mood'],
      summary: 'Log mood entry',
      description: 'Logs a new mood entry for the authenticated user. Requires create_journal permission.',
      operationId: 'logMood',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateMoodRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Mood logged successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      moodEntry: { $ref: '#/components/schemas/MoodEntry' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Mood logged successfully' },
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
      tags: ['Mood'],
      summary: 'Get mood history',
      description: 'Retrieves mood history for the authenticated user with pagination and filtering',
      operationId: 'getMoodHistory',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' as const, minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 } },
        { name: 'sortBy', in: 'query', schema: { type: 'string' as const, enum: ['timestamp', 'intensity', 'current'], default: 'timestamp' } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string' as const, enum: ['asc', 'desc'], default: 'desc' } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'mood', in: 'query', schema: { type: 'string' as const } },
        { name: 'minIntensity', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 10 } },
        { name: 'maxIntensity', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 10 } }
      ],
      responses: {
        '200': {
          description: 'Mood history retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const },
                  data: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/MoodEntry' }
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
  '/api/v1/mood/insights': {
    get: {
      tags: ['Mood', 'Analytics'],
      summary: 'Get mood insights',
      description: 'Retrieves mood insights, trends, and patterns for the authenticated user',
      operationId: 'getMoodInsights',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'period', in: 'query', schema: { type: 'string' as const, enum: ['7d', '30d', '90d', '1y'], default: '30d' } },
        { name: 'includeRecommendations', in: 'query', schema: { type: 'boolean' as const, default: true } }
      ],
      responses: {
        '200': {
          description: 'Mood insights retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/MoodInsights' },
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
  '/api/v1/mood/{id}': {
    put: {
      tags: ['Mood'],
      summary: 'Update mood entry',
      description: 'Updates a specific mood entry by its ID. Users can only update their own entries.',
      operationId: 'updateMood',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateMoodRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Mood updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      moodEntry: { $ref: '#/components/schemas/MoodEntry' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Mood updated successfully' },
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
      tags: ['Mood'],
      summary: 'Delete mood entry',
      description: 'Deletes a specific mood entry by its ID. Users can only delete their own entries.',
      operationId: 'deleteMood',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Mood deleted successfully',
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
  '/api/v1/mood/admin/analytics': {
    get: {
      tags: ['Mood', 'Admin', 'Analytics'],
      summary: 'Get mood analytics (Admin)',
      description: 'Retrieves mood analytics for company. Company admins see their company data, super admins see all data.',
      operationId: 'getMoodAnalyticsAdmin',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'period', in: 'query', schema: { type: 'string' as const, enum: ['7d', '30d', '90d', '1y'], default: '30d' } },
        { name: 'userId', in: 'query', schema: { type: 'string' as const } },
        { name: 'companyId', in: 'query', schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Admin mood analytics retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { type: 'object' as const },
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
  }
};