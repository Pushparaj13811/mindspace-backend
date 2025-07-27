export const aiSchemas = {
  AIResponse: {
    type: 'object' as const,
    properties: {
      response: {
        type: 'string' as const,
        description: 'AI-generated response',
        example: 'Based on your recent mood patterns, I notice you\'ve been feeling more positive lately...'
      },
      model: {
        type: 'string' as const,
        description: 'AI model used for the response',
        example: 'gpt-4'
      },
      tokensUsed: {
        type: 'number' as const,
        description: 'Number of tokens used',
        example: 150
      },
      cost: {
        type: 'number' as const,
        description: 'Cost of the AI request',
        example: 0.003
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Response generation timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['response', 'model']
  },
  AIChatRequest: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 4000,
        description: 'Message to send to AI assistant',
        example: 'I\'ve been feeling anxious lately. Can you help me understand why?'
      },
      includeContext: {
        type: 'boolean' as const,
        description: 'Whether to include user context for personalized responses',
        default: true,
        example: true
      }
    },
    required: ['message']
  },
  AIAnalyzeRequest: {
    type: 'object' as const,
    properties: {
      entryId: {
        type: 'string' as const,
        description: 'ID of the journal entry to analyze',
        example: 'journal_64f1a2b3c4d5e6f7g8h9i0j1'
      }
    },
    required: ['entryId']
  },
  AIWellnessContent: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string' as const,
        enum: ['daily_affirmation', 'mindfulness_tip', 'gratitude_prompt', 'breathing_exercise'],
        description: 'Type of wellness content',
        example: 'daily_affirmation'
      },
      content: {
        type: 'string' as const,
        description: 'Generated wellness content',
        example: 'Today, remember that every small step forward is progress. You are capable of amazing things.'
      },
      personalized: {
        type: 'boolean' as const,
        description: 'Whether the content is personalized',
        example: true
      },
      metadata: {
        type: 'object' as const,
        properties: {
          duration: {
            type: 'string' as const,
            description: 'Duration for exercises',
            example: '5 minutes'
          },
          difficulty: {
            type: 'string' as const,
            description: 'Difficulty level',
            example: 'beginner'
          },
          tags: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Content tags',
            example: ['mindfulness', 'stress-relief', 'morning-routine']
          }
        }
      }
    }
  },
  AICapabilities: {
    type: 'object' as const,
    properties: {
      availableModels: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            model: {
              type: 'string' as const,
              example: 'gpt-4'
            },
            description: {
              type: 'string' as const,
              example: 'Advanced language model for complex analysis'
            },
            capabilities: {
              type: 'array' as const,
              items: {
                type: 'string' as const
              },
              example: ['chat', 'analysis', 'content_generation']
            }
          }
        }
      },
      features: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'Available AI features',
        example: [
          'Personalized chat companion',
          'Journal entry analysis',
          'Mood pattern insights',
          'Wellness content generation'
        ]
      },
      limits: {
        type: 'object' as const,
        properties: {
          dailyRequests: {
            type: 'number' as const,
            description: 'Daily request limit',
            example: 100
          },
          maxTokensPerRequest: {
            type: 'number' as const,
            description: 'Maximum tokens per request',
            example: 4000
          },
          concurrentRequests: {
            type: 'number' as const,
            description: 'Maximum concurrent requests',
            example: 3
          }
        }
      },
      usage: {
        type: 'object' as const,
        properties: {
          dailyRequestsUsed: {
            type: 'number' as const,
            description: 'Requests used today',
            example: 15
          },
          tokensUsedToday: {
            type: 'number' as const,
            description: 'Tokens used today',
            example: 2500
          },
          costToday: {
            type: 'number' as const,
            description: 'Cost incurred today',
            example: 0.125
          }
        }
      }
    }
  }
};