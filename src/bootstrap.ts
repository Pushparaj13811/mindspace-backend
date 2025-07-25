import { 
  container, 
  SERVICE_KEYS, 
  serviceProviderManager, 
  serviceHealthChecker 
} from './core/container/ServiceContainer.js';
import { AppwriteServiceProvider } from './core/providers/AppwriteServiceProvider.js';
import { BusinessServiceProvider } from './core/providers/BusinessServiceProvider.js';
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
 * This uses the service provider pattern for better organization
 */
async function registerServices(): Promise<void> {
  // Add service providers
  serviceProviderManager.addProvider(new AppwriteServiceProvider());
  serviceProviderManager.addProvider(new BusinessServiceProvider());

  // Register all services through providers
  serviceProviderManager.registerAll(container);

  logger.info('Service registration completed', {
    registeredServices: container.getRegisteredKeys()
  });
}

/**
 * Test connections to all external services
 * This uses the service health checker for better organization
 */
async function testServiceConnections(): Promise<void> {
  try {
    const healthSummary = await serviceHealthChecker.getHealthSummary();
    
    logger.info('Service health check completed', {
      totalServices: healthSummary.totalServices,
      healthyServices: healthSummary.healthyServices,
      unhealthyServices: healthSummary.unhealthyServices
    });

    // Log individual service status
    Object.entries(healthSummary.details).forEach(([serviceName, status]) => {
      if (status.healthy) {
        logger.info(`✅ ${serviceName} service healthy`);
      } else {
        logger.warn(`⚠️  ${serviceName} service unhealthy: ${status.error}`);
      }
    });

    // Warn if critical services are unhealthy
    const criticalServices = [
      SERVICE_KEYS.AUTH_SERVICE,
      SERVICE_KEYS.DATABASE_SERVICE,
      SERVICE_KEYS.PERMISSION_SERVICE
    ];

    const unhealthyCriticalServices = criticalServices.filter(
      service => !healthSummary.details[service]?.healthy
    );

    if (unhealthyCriticalServices.length > 0) {
      logger.warn('Critical services are unhealthy:', unhealthyCriticalServices);
    }

  } catch (error) {
    logger.error('Service health check failed:', error);
  }
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