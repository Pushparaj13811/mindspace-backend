export const moodSchemas = {
  MoodState: {
    type: 'object' as const,
    properties: {
      current: {
        type: 'string' as const,
        enum: ['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed', 'excited', 'angry', 'peaceful', 'stressed'],
        description: 'Current mood state',
        example: 'happy'
      },
      intensity: {
        type: 'number' as const,
        minimum: 1,
        maximum: 10,
        description: 'Mood intensity level (1-10)',
        example: 7
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'When the mood was recorded',
        example: '2024-01-15T10:30:00.000Z'
      },
      triggers: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'Triggers that influenced the mood',
        example: ['work stress', 'good weather']
      },
      notes: {
        type: 'string' as const,
        description: 'Additional notes about the mood',
        example: 'Feeling great after morning exercise'
      }
    },
    required: ['current', 'intensity', 'timestamp']
  },
  MoodEntry: {
    type: 'object' as const,
    properties: {
      $id: {
        type: 'string' as const,
        description: 'Unique mood entry identifier',
        example: 'mood_64f1a2b3c4d5e6f7g8h9i0j1'
      },
      userId: {
        type: 'string' as const,
        description: 'ID of the user who logged this mood',
        example: '64f1a2b3c4d5e6f7g8h9i0j1'
      },
      current: {
        type: 'string' as const,
        enum: ['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed', 'excited', 'angry', 'peaceful', 'stressed'],
        description: 'Current mood state',
        example: 'happy'
      },
      intensity: {
        type: 'number' as const,
        minimum: 1,
        maximum: 10,
        description: 'Mood intensity level (1-10)',
        example: 7
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'When the mood was recorded',
        example: '2024-01-15T10:30:00.000Z'
      },
      triggers: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'Triggers that influenced the mood',
        example: ['work stress', 'good weather']
      },
      notes: {
        type: 'string' as const,
        description: 'Additional notes about the mood',
        example: 'Feeling great after morning exercise'
      },
      context: {
        type: 'object' as const,
        properties: {
          location: {
            type: 'string' as const,
            description: 'Location when mood was recorded',
            example: 'home'
          },
          activity: {
            type: 'string' as const,
            description: 'Activity during mood recording',
            example: 'working'
          },
          weather: {
            type: 'string' as const,
            description: 'Weather conditions',
            example: 'sunny'
          },
          socialSituation: {
            type: 'string' as const,
            description: 'Social context',
            example: 'alone'
          }
        }
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
    required: ['$id', 'userId', 'current', 'intensity', 'timestamp', 'createdAt', 'updatedAt']
  },
  CreateMoodRequest: {
    type: 'object' as const,
    properties: {
      current: {
        type: 'string' as const,
        enum: ['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed', 'excited', 'angry', 'peaceful', 'stressed'],
        description: 'Current mood state',
        example: 'happy'
      },
      intensity: {
        type: 'number' as const,
        minimum: 1,
        maximum: 10,
        description: 'Mood intensity level (1-10)',
        example: 7
      },
      timestamp: {
        type: 'string' as const,
        format: 'date-time',
        description: 'When the mood was recorded (optional, defaults to current time)',
        example: '2024-01-15T10:30:00.000Z'
      },
      triggers: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          maxLength: 100
        },
        maxItems: 10,
        description: 'Triggers that influenced the mood',
        example: ['work stress', 'good weather']
      },
      notes: {
        type: 'string' as const,
        maxLength: 500,
        description: 'Additional notes about the mood',
        example: 'Feeling great after morning exercise'
      },
      context: {
        type: 'object' as const,
        properties: {
          location: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Location when mood was recorded',
            example: 'home'
          },
          activity: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Activity during mood recording',
            example: 'working'
          },
          weather: {
            type: 'string' as const,
            maxLength: 50,
            description: 'Weather conditions',
            example: 'sunny'
          },
          socialSituation: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Social context',
            example: 'alone'
          }
        }
      }
    },
    required: ['current', 'intensity']
  },
  UpdateMoodRequest: {
    type: 'object' as const,
    properties: {
      current: {
        type: 'string' as const,
        enum: ['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed', 'excited', 'angry', 'peaceful', 'stressed'],
        description: 'Current mood state'
      },
      intensity: {
        type: 'number' as const,
        minimum: 1,
        maximum: 10,
        description: 'Mood intensity level (1-10)'
      },
      triggers: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          maxLength: 100
        },
        maxItems: 10,
        description: 'Triggers that influenced the mood'
      },
      notes: {
        type: 'string' as const,
        maxLength: 500,
        description: 'Additional notes about the mood'
      },
      context: {
        type: 'object' as const,
        properties: {
          location: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Location when mood was recorded'
          },
          activity: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Activity during mood recording'
          },
          weather: {
            type: 'string' as const,
            maxLength: 50,
            description: 'Weather conditions'
          },
          socialSituation: {
            type: 'string' as const,
            maxLength: 100,
            description: 'Social context'
          }
        }
      }
    }
  },
  MoodInsights: {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string' as const,
        description: 'Analysis period',
        example: '30d'
      },
      averageMood: {
        type: 'number' as const,
        description: 'Average mood intensity',
        example: 6.5
      },
      moodDistribution: {
        type: 'object' as const,
        additionalProperties: {
          type: 'number' as const
        },
        description: 'Distribution of mood states',
        example: {
          happy: 40,
          calm: 30,
          anxious: 20,
          sad: 10
        }
      },
      trends: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            date: {
              type: 'string' as const,
              format: 'date'
            },
            averageIntensity: {
              type: 'number' as const
            }
          }
        },
        description: 'Mood trends over time'
      },
      recommendations: {
        type: 'array' as const,
        items: {
          type: 'string' as const
        },
        description: 'AI-generated recommendations',
        example: [
          'Consider maintaining your morning exercise routine',
          'Try meditation during stressful work periods'
        ]
      }
    }
  }
};