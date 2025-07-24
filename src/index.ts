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
              description: 'AI-powered mental wellness platform API',
            },
            tags: [
              { name: 'Auth', description: 'Authentication endpoints' },
              { name: 'Journal', description: 'Journal management endpoints' },
              { name: 'Mood', description: 'Mood tracking endpoints' },
              { name: 'AI', description: 'AI integration endpoints' },
            ],
            servers: [
              {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
              },
            ],
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