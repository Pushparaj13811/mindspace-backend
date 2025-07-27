export const aiPaths = {
  '/api/v1/ai/chat': {
    post: {
      tags: ['AI'],
      summary: 'Chat with AI wellness companion',
      description: 'Send a message to the AI wellness companion and receive a personalized response based on your mental health data',
      operationId: 'chatWithAI',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AIChatRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'AI response generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/AIResponse' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' }
      }
    }
  },
  '/api/v1/ai/analyze/journal': {
    post: {
      tags: ['AI'],
      summary: 'Analyze journal entry with AI',
      description: 'Get AI-powered analysis of a journal entry including sentiment, emotions, themes, and personalized suggestions',
      operationId: 'analyzeJournalEntry',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AIAnalyzeRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Journal analysis completed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/JournalAnalysis' },
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
    }
  },
  '/api/v1/ai/insights/mood': {
    get: {
      tags: ['AI'],
      summary: 'Get AI mood insights',
      description: 'Receive AI-powered insights about mood patterns, trends, and personalized recommendations',
      operationId: 'getAIMoodInsights',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'period', in: 'query', schema: { type: 'string' as const, enum: ['7d', '30d', '90d'], default: '30d' } }
      ],
      responses: {
        '200': {
          description: 'AI mood insights generated',
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
  '/api/v1/ai/content/wellness': {
    get: {
      tags: ['AI'],
      summary: 'Generate wellness content',
      description: 'Get AI-generated personalized wellness content including affirmations, mindfulness tips, gratitude prompts, and breathing exercises',
      operationId: 'getWellnessContent',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'type', in: 'query', schema: { type: 'string' as const, enum: ['daily_affirmation', 'mindfulness_tip', 'gratitude_prompt', 'breathing_exercise'], default: 'daily_affirmation' } }
      ],
      responses: {
        '200': {
          description: 'Wellness content generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/AIWellnessContent' },
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
  '/api/v1/ai/capabilities': {
    get: {
      tags: ['AI'],
      summary: 'Get AI capabilities',
      description: 'Retrieve information about available AI features, rate limits, and capabilities',
      operationId: 'getAICapabilities',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'AI capabilities retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: { $ref: '#/components/schemas/AICapabilities' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },
  '/api/v1/ai/health': {
    get: {
      tags: ['AI'],
      summary: 'AI service health check',
      description: 'Check the health and availability of the AI service',
      operationId: 'getAIHealth',
      responses: {
        '200': {
          description: 'AI service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' as const, enum: ['healthy', 'degraded', 'unhealthy'] },
                  models: {
                    type: 'object' as const,
                    additionalProperties: { type: 'boolean' as const }
                  },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '503': {
          description: 'AI service unavailable',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
};