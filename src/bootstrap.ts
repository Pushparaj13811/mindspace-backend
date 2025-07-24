import { container, SERVICE_KEYS } from './container/ServiceContainer.js';
import { AppwriteAuthService } from './services/AppwriteAuthService.js';
import { AppwriteDatabaseService } from './services/AppwriteDatabaseService.js';
import { GeminiAIService } from './services/GeminiAIService.js';
import { config, validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';

/**
 * Bootstrap function to initialize all services and dependencies
 * This follows the dependency injection pattern where all external
 * services are registered in the container during startup
 */
export async function bootstrap(): Promise<void> {
  try {
    logger.info('🔧 Starting service initialization...');

    // Validate environment configuration
    validateConfig();
    logger.info('✅ Environment configuration validated');

    // Register services in dependency injection container
    await registerServices();
    logger.info('✅ All services registered successfully');

    // Test service connections
    await testServiceConnections();
    logger.info('✅ Service connections tested');

    logger.info('🚀 Bootstrap completed successfully');
  } catch (error) {
    logger.error('❌ Bootstrap failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

/**
 * Register all service implementations in the DI container
 * This is where we wire up the concrete implementations to interfaces
 */
async function registerServices(): Promise<void> {
  // Register Auth Service (Appwrite implementation)
  container.register(SERVICE_KEYS.AUTH_SERVICE, () => {
    logger.info('Creating AppwriteAuthService instance');
    return new AppwriteAuthService();
  });

  // Register Database Service (Appwrite implementation)
  container.register(SERVICE_KEYS.DATABASE_SERVICE, () => {
    logger.info('Creating AppwriteDatabaseService instance');
    return new AppwriteDatabaseService();
  });

  // Register AI Service (Gemini implementation)
  container.register(SERVICE_KEYS.AI_SERVICE, () => {
    logger.info('Creating GeminiAIService instance');
    return new GeminiAIService();
  });

  // TODO: Register other services as we implement them
  // container.register(SERVICE_KEYS.FILE_SERVICE, () => new AppwriteFileService());
  // container.register(SERVICE_KEYS.NOTIFICATION_SERVICE, () => new ExpoNotificationService());

  logger.info('Service registration completed', {
    registeredServices: [
      SERVICE_KEYS.AUTH_SERVICE,
      SERVICE_KEYS.DATABASE_SERVICE,
      SERVICE_KEYS.AI_SERVICE,
    ]
  });
}

/**
 * Test connections to all external services
 * This helps identify configuration issues early
 */
async function testServiceConnections(): Promise<void> {
  const connectionTests: Array<{ name: string; test: () => Promise<boolean> }> = [];

  // Test database connection
  try {
    const databaseService = container.resolve<any>(SERVICE_KEYS.DATABASE_SERVICE);
    connectionTests.push({
      name: 'Database Service',
      test: () => databaseService.healthCheck()
    });
  } catch (error) {
    logger.warn('Database service not available for health check');
  }

  // Run all connection tests
  const results = await Promise.allSettled(
    connectionTests.map(async ({ name, test }) => {
      const isHealthy = await test();
      return { name, isHealthy };
    })
  );

  // Log results
  results.forEach((result, index) => {
    const testName = connectionTests[index]?.name || 'Unknown Service';
    
    if (result.status === 'fulfilled') {
      if (result.value.isHealthy) {
        logger.info(`✅ ${testName} connection successful`);
      } else {
        logger.warn(`⚠️  ${testName} connection failed - service may not function properly`);
      }
    } else {
      logger.error(`❌ ${testName} connection test failed`, { 
        error: result.reason 
      });
    }
  });
}

/**
 * Cleanup function for graceful shutdown
 * This should be called when the application is shutting down
 */
export async function cleanup(): Promise<void> {
  try {
    logger.info('🧹 Starting cleanup process...');

    // Clear the service container
    container.clear();

    // TODO: Add cleanup for other resources
    // - Close database connections
    // - Stop background jobs
    // - Clear caches
    // - etc.

    logger.info('✅ Cleanup completed successfully');
  } catch (error) {
    logger.error('❌ Cleanup failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}