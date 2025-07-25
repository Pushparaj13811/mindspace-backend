import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { bootstrap as initializeServices, cleanup } from './bootstrap.js';
import { container, SERVICE_KEYS } from './container/ServiceContainer.js';
import type { IDatabaseService } from './interfaces/IDatabaseService.js';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from './utils/response.js';

// Import routes
import { authRoutes } from './routes/auth.js';
import { journalRoutes } from './routes/journal.js';
import { moodRoutes } from './routes/mood.js';
import { aiRoutes } from './routes/ai.js';
import { companyRoutes } from './routes/company.js';

async function startServer() {
  try {
    // Initialize all services
    await initializeServices();

    // Create Elysia app
    const app = new Elysia()
      .use(
        cors({
          origin: config.cors.allowedOrigins,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        })
      )
      .use(
        swagger({
          documentation: {
            info: {
              title: 'MindSpace API',
              version: '1.0.0',
              description: `
                AI-powered mental wellness platform API
                
                ## Authentication
                
                This API supports two authentication methods:
                
                ### 1. Email/Password Authentication
                Use the \`/api/v1/auth/login\` endpoint to authenticate with email and password.
                
                ### 2. OAuth2 Authentication (Google)
                Use the OAuth2 flow for Google authentication:
                1. Call \`/api/v1/auth/oauth2/initiate\` to get a redirect URL
                2. Redirect user to the returned URL for Google authentication
                3. Google will redirect back to \`/api/v1/auth/oauth2/callback\`
                4. The callback will return user data and session tokens
                
                ## Authorization
                
                After successful authentication, include the access token in the Authorization header:
                \`\`\`
                Authorization: Bearer <your-access-token>
                \`\`\`
                
                ## Rate Limiting
                
                Authentication endpoints are rate-limited to prevent abuse. If you exceed the rate limit, 
                you'll receive a 429 status code.
                
                ## Error Handling
                
                All endpoints return consistent error responses:
                \`\`\`json
                {
                  "success": false,
                  "error": "Error message",
                  "message": "Optional additional context",
                  "timestamp": "2024-01-15T10:30:00.000Z"
                }
                \`\`\`
              `,
            },
            tags: [
              { 
                name: 'Auth', 
                description: 'Authentication and user management endpoints including OAuth2 support' 
              },
              { 
                name: 'Journal', 
                description: 'Journal management endpoints for creating and managing journal entries' 
              },
              { 
                name: 'Mood', 
                description: 'Mood tracking endpoints for logging and analyzing mood data' 
              },
              { 
                name: 'AI', 
                description: 'AI integration endpoints for intelligent insights and analysis' 
              },
            ],
            servers: [
              {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
              },
            ],
            components: {
              securitySchemes: {
                bearerAuth: {
                  type: 'http',
                  scheme: 'bearer',
                  bearerFormat: 'JWT',
                  description: 'JWT access token obtained from login or OAuth2 authentication'
                }
              },
              schemas: {
                User: {
                  type: 'object',
                  properties: {
                    $id: {
                      type: 'string',
                      description: 'Unique user identifier'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email address'
                    },
                    name: {
                      type: 'string',
                      description: 'User display name'
                    },
                    avatar: {
                      type: 'string',
                      format: 'uri',
                      description: 'User avatar URL',
                      nullable: true
                    },
                    subscription: {
                      type: 'object',
                      properties: {
                        tier: {
                          type: 'string',
                          enum: ['free', 'premium', 'enterprise'],
                          description: 'User subscription tier'
                        },
                        validUntil: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Subscription expiration date',
                          nullable: true
                        }
                      }
                    },
                    preferences: {
                      type: 'object',
                      properties: {
                        theme: {
                          type: 'string',
                          enum: ['light', 'dark', 'auto'],
                          description: 'User interface theme preference'
                        },
                        notifications: {
                          type: 'boolean',
                          description: 'Whether notifications are enabled'
                        },
                        preferredAIModel: {
                          type: 'string',
                          description: 'Preferred AI model for analysis'
                        },
                        language: {
                          type: 'string',
                          description: 'User interface language'
                        }
                      }
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Account creation timestamp'
                    },
                    updatedAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Last account update timestamp'
                    }
                  }
                },
                AuthTokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      description: 'JWT access token for API authentication'
                    },
                    refreshToken: {
                      type: 'string',
                      description: 'Refresh token for obtaining new access tokens'
                    },
                    expiresIn: {
                      type: 'number',
                      description: 'Access token expiration time in seconds'
                    }
                  }
                },
                OAuth2InitiateRequest: {
                  type: 'object',
                  required: ['provider'],
                  properties: {
                    provider: {
                      type: 'string',
                      enum: ['google'],
                      description: 'OAuth2 provider - currently only Google is supported'
                    },
                    successUrl: {
                      type: 'string',
                      format: 'uri',
                      description: 'URL to redirect to after successful authentication'
                    },
                    failureUrl: {
                      type: 'string',
                      format: 'uri',
                      description: 'URL to redirect to after failed authentication'
                    }
                  }
                },
                OAuth2CallbackQuery: {
                  type: 'object',
                  required: ['userId', 'secret'],
                  properties: {
                    userId: {
                      type: 'string',
                      description: 'User ID returned by OAuth2 provider'
                    },
                    secret: {
                      type: 'string',
                      description: 'Secret token returned by OAuth2 provider'
                    }
                  }
                },
                SuccessResponse: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      enum: [true]
                    },
                    data: {
                      type: 'object',
                      description: 'Response data'
                    },
                    message: {
                      type: 'string',
                      description: 'Success message'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Response timestamp'
                    }
                  }
                },
                ErrorResponse: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      enum: [false]
                    },
                    error: {
                      type: 'string',
                      description: 'Error message'
                    },
                    message: {
                      type: 'string',
                      description: 'Additional error context'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Response timestamp'
                    }
                  }
                }
              }
            }
          },
        })
      )
      // Global error handler
      .onError(({ error, code }) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Unhandled error', { error: errorMessage, code });
        
        switch (code) {
          case 'VALIDATION':
            return createErrorResponse(
              HTTP_STATUS.BAD_REQUEST,
              'Validation Error',
              errorMessage
            );
          case 'NOT_FOUND':
            return createErrorResponse(
              HTTP_STATUS.NOT_FOUND,
              'Endpoint not found'
            );
          default:
            return createErrorResponse(
              HTTP_STATUS.INTERNAL_SERVER_ERROR,
              'Internal Server Error'
            );
        }
      })
      // Health check endpoint
      .get('/health', async () => {
        let databaseHealthy = false;
        
        try {
          const databaseService = container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE);
          databaseHealthy = await databaseService.healthCheck();
        } catch (error) {
          logger.warn('Database service not available for health check');
        }
        
        const health = {
          status: databaseHealthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          services: {
            database: databaseHealthy ? 'healthy' : 'unhealthy',
          },
        };

        const status = databaseHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
        return createSuccessResponse(status, health);
      })
      // API info endpoint
      .get('/api/v1', () => {
        return createSuccessResponse(HTTP_STATUS.OK, {
          name: 'MindSpace API',
          version: '1.0.0',
          description: 'AI-powered mental wellness platform',
          endpoints: {
            health: '/health',
            docs: '/swagger',
            auth: '/api/v1/auth',
            journal: '/api/v1/journal',
            mood: '/api/v1/mood',
            ai: '/api/v1/ai',
          },
        });
      })
      // Add route groups
      .group('/api/v1/auth', (app) => app.use(authRoutes))
      .group('/api/v1/journal', (app) => app.use(journalRoutes))
      .group('/api/v1/mood', (app) => app.use(moodRoutes))
      .group('/api/v1/ai', (app) => app.use(aiRoutes))
      .group('/api/v1', (app) => app.use(companyRoutes))
      
      // Catch-all 404 handler
      .all('*', () => {
        return createErrorResponse(
          HTTP_STATUS.NOT_FOUND,
          'Endpoint not found',
          'The requested endpoint does not exist'
        );
      });

    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 MindSpace API server started`);
      logger.info(`📍 Server running on http://localhost:${config.port}`);
      logger.info(`📚 API documentation available at http://localhost:${config.port}/swagger`);
      logger.info(`🏥 Health check available at http://localhost:${config.port}/health`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      // Cleanup services and resources
      await cleanup();
      
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();