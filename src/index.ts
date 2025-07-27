import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { bootstrap as initializeServices, cleanup } from './bootstrap.js';
import { serviceHealthChecker } from './core/container/ServiceContainer.js';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from './utils/response.js';
import { PermissionError } from './core/middleware/PermissionGuard.js';
import { swaggerConfig } from './swagger/index.js';

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
      .use(swagger(swaggerConfig))
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
          capabilities: [
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
            mood: '/api/v1/mood',
            journal: '/api/v1/journal',
            ai: '/api/v1/ai',
            companies: '/api/v1/companies',
          },
          authentication: {
            login: '/api/v1/auth/login',
            register: '/api/v1/auth/register',
            oauth2: '/api/v1/auth/oauth2/initiate',
            profile: '/api/v1/auth/me',
          },
          features: {
            moodTracking: '/api/v1/mood',
            journaling: '/api/v1/journal',
            aiChat: '/api/v1/ai/chat',
            insights: '/api/v1/mood/insights',
            analytics: '/api/v1/journal/analytics',
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