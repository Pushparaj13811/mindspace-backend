export const journalSchemas = {
  JournalEntry: {
    type: 'object' as const,
    properties: {
      $id: {
        type: 'string' as const,
        description: 'Unique journal entry identifier',
        example: 'journal_64f1a2b3c4d5e6f7g8h9i0j1'
      },
      userId: {
        type: 'string' as const,
        description: 'ID of the user who created this entry',
        example: '64f1a2b3c4d5e6f7g8h9i0j1'
      },
      title: {
        type: 'string' as const,
        description: 'Journal entry title',
        example: 'My reflection on today'
      },
      content: {
        type: 'string' as const,
        description: 'Journal entry content',
        example: 'Today was a good day. I accomplished my goals...'
      },
      mood: {
        $ref: '#/components/schemas/MoodState'
      },
      tags: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'Tags associated with the entry',
        example: ['reflection', 'productivity', 'gratitude']
      },
      aiInsights: {
        type: 'object' as const,
        properties: {
          sentiment: {
            type: 'number' as const,
            description: 'Sentiment score (-1 to 1)',
            example: 0.8
          },
          emotions: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Detected emotions',
            example: ['joy', 'satisfaction', 'optimism']
          },
          themes: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Identified themes',
            example: ['personal growth', 'goal achievement', 'gratitude']
          },
          suggestions: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'AI-generated suggestions',
            example: ['Continue with your mindfulness practice', 'Set new challenging goals']
          }
        }
      },
      attachments: {
        type: 'object' as const,
        properties: {
          images: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Array of image URLs',
            example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
          },
          voiceRecording: {
            type: 'string' as const,
            description: 'Voice recording URL',
            example: 'https://example.com/voice.mp3'
          }
        }
      },
      encrypted: {
        type: 'boolean' as const,
        description: 'Whether the entry is encrypted',
        example: false
      },
      createdAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Entry creation timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      updatedAt: {
        type: 'string' as const,
        format: 'date-time',
        description: 'Entry last update timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['$id', 'userId', 'title', 'content', 'mood', 'tags', 'attachments', 'encrypted', 'createdAt', 'updatedAt']
  },
  CreateJournalRequest: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 200,
        description: 'Journal entry title',
        example: 'My reflection on today'
      },
      content: {
        type: 'string' as const,
        minLength: 10,
        maxLength: 10000,
        description: 'Journal entry content',
        example: 'Today was a good day. I accomplished my goals and felt positive about the future...'
      },
      mood: {
        $ref: '#/components/schemas/MoodState'
      },
      tags: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          maxLength: 50
        },
        maxItems: 20,
        description: 'Tags associated with the entry',
        example: ['reflection', 'productivity', 'gratitude']
      },
      attachments: {
        type: 'object' as const,
        properties: {
          images: {
            type: 'array' as const,
            items: {
              type: 'string' as const,
              format: 'uri'
            },
            maxItems: 10,
            description: 'Array of image URLs',
            example: ['https://example.com/image1.jpg']
          },
          voiceRecording: {
            type: 'string' as const,
            format: 'uri',
            description: 'Voice recording URL',
            example: 'https://example.com/voice.mp3'
          }
        }
      }
    },
    required: ['title', 'content', 'mood']
  },
  UpdateJournalRequest: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 200,
        description: 'Journal entry title'
      },
      content: {
        type: 'string' as const,
        minLength: 10,
        maxLength: 10000,
        description: 'Journal entry content'
      },
      mood: {
        $ref: '#/components/schemas/MoodState'
      },
      tags: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          maxLength: 50
        },
        maxItems: 20,
        description: 'Tags associated with the entry'
      }
    }
  },
  JournalAnalysis: {
    type: 'object' as const,
    properties: {
      entryId: {
        type: 'string' as const,
        description: 'ID of the analyzed journal entry',
        example: 'journal_64f1a2b3c4d5e6f7g8h9i0j1'
      },
      analysis: {
        type: 'object' as const,
        properties: {
          sentiment: {
            type: 'object' as const,
            properties: {
              score: {
                type: 'number' as const,
                description: 'Overall sentiment score (-1 to 1)',
                example: 0.8
              },
              label: {
                type: 'string' as const,
                description: 'Sentiment label',
                example: 'positive'
              }
            }
          },
          emotions: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                emotion: {
                  type: 'string' as const,
                  example: 'joy'
                },
                confidence: {
                  type: 'number' as const,
                  example: 0.85
                }
              }
            }
          },
          themes: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Key themes identified',
            example: ['personal growth', 'achievement', 'gratitude']
          },
          keyPhrases: {
            type: 'array' as const,
            items: {
              type: 'string' as const
            },
            description: 'Important phrases extracted',
            example: ['accomplished my goals', 'positive about the future']
          }
        }
      },
      suggestions: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'Personalized suggestions based on analysis',
        example: [
          'Your positive outlook is great! Consider documenting specific achievements to track progress.',
          'Setting new challenging goals could help maintain this momentum.'
        ]
      }
    }
  }
};