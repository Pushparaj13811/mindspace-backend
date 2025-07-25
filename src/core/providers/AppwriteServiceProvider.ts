import type { ServiceProvider, ServiceRegistry } from '../container/ServiceContainer.js';
import { SERVICE_KEYS } from '../container/ServiceContainer.js';
import type { IDatabaseService, IPermissionService, IAuthService } from '../interfaces/index.js';

// Import adapters
import { AppwriteAuthAdapter } from '../../services/auth/AppwriteAuthAdapter.js';
import { AppwriteDatabaseAdapter } from '../../services/database/AppwriteDatabaseAdapter.js';
import { AppwriteStorageAdapter } from '../../services/storage/AppwriteStorageAdapter.js';

// Import core services
import { PermissionService } from '../services/PermissionService.js';
import { PermissionGuard } from '../middleware/PermissionGuard.js';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware.js';

/**
 * Appwrite service provider
 * Registers all Appwrite-based service implementations
 */
export class AppwriteServiceProvider implements ServiceProvider {
  getName(): string {
    return 'Appwrite Services';
  }

  register(container: ServiceRegistry): void {
    // Register core adapters
    container.register(SERVICE_KEYS.AUTH_SERVICE, () => new AppwriteAuthAdapter());
    container.register(SERVICE_KEYS.DATABASE_SERVICE, () => new AppwriteDatabaseAdapter());
    container.register(SERVICE_KEYS.STORAGE_SERVICE, () => new AppwriteStorageAdapter());

    // Register business logic services that depend on adapters
    container.register(SERVICE_KEYS.PERMISSION_SERVICE, () => {
      const databaseService = container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE);
      return new PermissionService(databaseService);
    });

    // Register middleware that depends on services
    container.register(SERVICE_KEYS.PERMISSION_GUARD, () => {
      const permissionService = container.resolve<IPermissionService>(SERVICE_KEYS.PERMISSION_SERVICE);
      return new PermissionGuard(permissionService);
    });

    container.register(SERVICE_KEYS.AUTH_MIDDLEWARE, () => {
      const authService = container.resolve<IAuthService>(SERVICE_KEYS.AUTH_SERVICE);
      const permissionGuard = container.resolve<PermissionGuard>(SERVICE_KEYS.PERMISSION_GUARD);
      return new AuthenticationMiddleware(authService, permissionGuard);
    });
  }
}