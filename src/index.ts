import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { bootstrap as initializeServices, cleanup } from './bootstrap.js';
import { serviceHealthChecker } from './core/container/ServiceContainer.js';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from './utils/response.js';
import { PermissionError } from './core/middleware/PermissionGuard.js';

// Import routes
import { authRoutes } from './routes/auth.js';
import { journalRoutes } from './routes/journal.js';
import { moodRoutes } from './routes/mood.js';
import { aiRoutes } from './routes/ai.js';
import { companyRoutes } from './routes/company.js';

async function startServer() {
  try {
    // Initialize all services using new architecture
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
                AI-powered mental wellness platform API with granular permission system
                
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
                
                ## Authorization & Permissions
                
                The API uses a granular permission system with role-based access control (RBAC):
                
                ### Roles:
                - **SUPER_ADMIN**: Platform management, all permissions
                - **COMPANY_ADMIN**: Company management, user administration
                - **COMPANY_MANAGER**: Department management, analytics
                - **COMPANY_USER**: Basic company features
                - **INDIVIDUAL_USER**: Personal data only
                
                ### Permissions:
                - Platform: manage_platform, view_platform_analytics, manage_companies
                - Company: manage_company, view_company_analytics, manage_company_users
                - User: manage_profile, create_journal, view_own_data, delete_account
                
                After successful authentication, include the access token in the Authorization header:
                \`\`\`
                Authorization: Bearer <your-access-token>
                \`\`\`
                
                ## Rate Limiting
                
                Authentication endpoints are rate-limited based on user role to prevent abuse.
                Higher roles have higher rate limits.
                
                ## Error Handling
                
                All endpoints return consistent error responses:
                \`\`\`json
                {
                  "success": false,
                  "error": "Error message",
                  "message": "Optional additional context",
                  "code": "ERROR_CODE",
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
                description: 'Journal management endpoints with permission-based access control' 
              },
              { 
                name: 'Mood', 
                description: 'Mood tracking endpoints with role-based permissions' 
              },
              { 
                name: 'AI', 
                description: 'AI integration endpoints for intelligent insights and analysis' 
              },
              {
                name: 'Company',
                description: 'Company management endpoints for administrators'
              },
              {
                name: 'Admin',
                description: 'Administrative endpoints requiring elevated permissions'
              }
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
                    role: {
                      type: 'string',
                      enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER', 'INDIVIDUAL_USER'],
                      description: 'User role in the system'
                    },
                    companyId: {
                      type: 'string',
                      description: 'Company ID (null for individual users and super admins)',
                      nullable: true
                    },
                    permissions: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of permissions granted to the user'
                    },
                    emailVerified: {
                      type: 'boolean',
                      description: 'Whether the user email is verified'
                    },
                    isActive: {
                      type: 'boolean',
                      description: 'Whether the user account is active'
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
                    lastLogin: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Last login timestamp',
                      nullable: true
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
                    code: {
                      type: 'string',
                      description: 'Error code for programmatic handling'
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
      // Global error handler with permission error support
      .onError(({ error, code, set }) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle permission errors specifically
        if (error instanceof PermissionError) {
          logger.warn('Permission denied', { 
            error: errorMessage, 
            code: error.code,
            statusCode: error.statusCode 
          });
          
          set.status = error.statusCode;
          return createErrorResponse(
            error.statusCode,
            error.message,
            error.code
          );
        }
        
        logger.error('Unhandled error', { error: errorMessage, code });
        
        switch (code) {
          case 'VALIDATION':
            set.status = HTTP_STATUS.BAD_REQUEST;
            return createErrorResponse(
              HTTP_STATUS.BAD_REQUEST,
              'Validation Error',
              errorMessage
            );
          case 'NOT_FOUND':
            set.status = HTTP_STATUS.NOT_FOUND;
            return createErrorResponse(
              HTTP_STATUS.NOT_FOUND,
              'Endpoint not found'
            );
          default:
            set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
            return createErrorResponse(
              HTTP_STATUS.INTERNAL_SERVER_ERROR,
              'Internal Server Error'
            );
        }
      })
      // Health check endpoint with service health checking
      .get('/health', async () => {
        try {
          const healthSummary = await serviceHealthChecker.getHealthSummary();
          
          const health = {
            status: healthSummary.unhealthyServices === 0 ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
              total: healthSummary.totalServices,
              healthy: healthSummary.healthyServices,
              unhealthy: healthSummary.unhealthyServices,
              details: healthSummary.details
            },
          };

          const status = healthSummary.unhealthyServices === 0 ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
          return createSuccessResponse(status, health);
        } catch (error) {
          logger.error('Health check failed:', error);
          return createErrorResponse(
            HTTP_STATUS.SERVICE_UNAVAILABLE,
            'Health check failed'
          );
        }
      })
      // API info endpoint
      .get('/api/v1', () => {
        return createSuccessResponse(HTTP_STATUS.OK, {
          name: 'MindSpace API',
          version: '1.0.0',
          description: 'AI-powered mental wellness platform with granular permissions',
          architecture: 'Clean Architecture with Service Adapters',
          features: [
            'Role-based access control (RBAC)',
            'Granular permissions system',
            'OAuth2 authentication',
            'Future-proof service adapters',
            'Comprehensive audit logging'
          ],
          endpoints: {
            health: '/health',
            docs: '/swagger',
            auth: '/api/v1/auth',
            journal: '/api/v1/journal',
            mood: '/api/v1/mood',
            ai: '/api/v1/ai',
            company: '/api/v1/company',
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
      .all('*', ({ set }) => {
        set.status = HTTP_STATUS.NOT_FOUND;
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
      logger.info(`🔐 Granular permission system enabled`);
      logger.info(`🏗️  Clean architecture with service adapters`);
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