export const healthPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check the health status of the API and its services',
      operationId: 'healthCheck',
      responses: {
        '200': {
          description: 'API is healthy',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/HealthResponse'
              }
            }
          }
        },
        '503': {
          description: 'Service unavailable',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/HealthResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1': {
    get: {
      tags: ['Health'],
      summary: 'API information',
      description: 'Get general information about the API',
      operationId: 'getApiInfo',
      responses: {
        '200': {
          description: 'API information',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      name: { type: 'string' as const, example: 'MindSpace API' },
                      version: { type: 'string' as const, example: '1.0.0' },
                      description: { type: 'string' as const },
                      architecture: { type: 'string' as const },
                      features: { type: 'array' as const, items: { type: 'string' as const } },
                      endpoints: { type: 'object' as const },
                      authentication: { type: 'object' as const }
                    }
                  },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  }
};