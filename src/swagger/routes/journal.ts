export const journalPaths = {
  '/api/v1/journal': {
    post: {
      tags: ['Journal'],
      summary: 'Create journal entry',
      description: 'Creates a new journal entry for the authenticated user',
      operationId: 'createJournalEntry',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateJournalRequest' }
          }
        }
      },
      responses: {
        '201': {
          description: 'Journal entry created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      journalEntry: { $ref: '#/components/schemas/JournalEntry' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Journal entry created successfully' },
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
      tags: ['Journal'],
      summary: 'Get journal entries',
      description: 'Retrieves journal entries for the authenticated user with pagination and filtering',
      operationId: 'getJournalEntries',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' as const, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 100 } },
        { name: 'sortBy', in: 'query', schema: { type: 'string' as const, enum: ['createdAt', 'updatedAt', 'title'] } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string' as const, enum: ['asc', 'desc'] } },
        { name: 'search', in: 'query', schema: { type: 'string' as const, maxLength: 100 } },
        { name: 'tags', in: 'query', schema: { type: 'string' as const } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string' as const, format: 'date-time' } }
      ],
      responses: {
        '200': {
          description: 'Journal entries retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const },
                  data: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/JournalEntry' }
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
  '/api/v1/journal/search': {
    get: {
      tags: ['Journal'],
      summary: 'Search journal entries',
      description: 'Searches journal entries by title and content for the authenticated user',
      operationId: 'searchJournalEntries',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', required: true, schema: { type: 'string' as const, minLength: 1, maxLength: 100 } },
        { name: 'page', in: 'query', schema: { type: 'integer' as const, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer' as const, minimum: 1, maximum: 100 } }
      ],
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const },
                  data: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/JournalEntry' }
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
  '/api/v1/journal/{id}': {
    get: {
      tags: ['Journal'],
      summary: 'Get journal entry by ID',
      description: 'Retrieves a specific journal entry by its ID',
      operationId: 'getJournalEntry',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Journal entry retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      journalEntry: { $ref: '#/components/schemas/JournalEntry' }
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
    put: {
      tags: ['Journal'],
      summary: 'Update journal entry',
      description: 'Updates a specific journal entry by its ID',
      operationId: 'updateJournalEntry',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateJournalRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Journal entry updated',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      journalEntry: { $ref: '#/components/schemas/JournalEntry' }
                    }
                  },
                  message: { type: 'string' as const, example: 'Journal entry updated successfully' },
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
      tags: ['Journal'],
      summary: 'Delete journal entry',
      description: 'Deletes a specific journal entry by its ID',
      operationId: 'deleteJournalEntry',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Journal entry deleted',
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
  '/api/v1/journal/analytics': {
    get: {
      tags: ['Journal', 'Analytics'],
      summary: 'Get journal analytics',
      description: 'Retrieves analytics data for journals',
      operationId: 'getJournalAnalytics',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'dateFrom', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string' as const, format: 'date-time' } },
        { name: 'companyId', in: 'query', schema: { type: 'string' as const } }
      ],
      responses: {
        '200': {
          description: 'Journal analytics retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
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