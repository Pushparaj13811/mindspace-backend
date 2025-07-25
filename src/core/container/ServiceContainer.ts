import type { IAuthService } from '../interfaces/IAuthService.js';
import type { IDatabaseService } from '../interfaces/IDatabaseService.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import type { IPermissionService } from '../interfaces/IPermissionService.js';
import type { IAIService } from '../interfaces/IAIService.js';
import type { IEmailService } from '../interfaces/IEmailService.js';
import type { INotificationService } from '../interfaces/INotificationService.js';
import type { ICompanyService } from '../interfaces/ICompanyService.js';

/**
 * Service container interface for dependency injection
 */
export interface ServiceContainer {
  // Core services
  authService: IAuthService;
  databaseService: IDatabaseService;
  storageService: IStorageService;
  permissionService: IPermissionService;
  
  // Business services
  aiService: IAIService;
  emailService: IEmailService;
  notificationService: INotificationService;
  companyService: ICompanyService;
}

/**
 * Service registry for dependency injection
 */
export interface ServiceRegistry {
  register<T>(key: string, factory: () => T): void;
  register<T>(key: string, instance: T): void;
  resolve<T>(key: string): T;
  isRegistered(key: string): boolean;
  clear(): void;
}

/**
 * Dependency injection container implementation
 */
class DIContainer implements ServiceRegistry {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();
  private singletons = new Map<string, any>();

  register<T>(key: string, instanceOrFactory: T | (() => T)): void {
    if (typeof instanceOrFactory === 'function') {
      this.factories.set(key, instanceOrFactory as () => T);
    } else {
      this.services.set(key, instanceOrFactory);
    }
  }

  registerSingleton<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    // Check if singleton instance already exists
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // Check if direct instance exists
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if factory exists
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      
      // Store as singleton if it was registered as singleton
      this.singletons.set(key, instance);
      
      return instance as T;
    }

    throw new Error(`Service '${key}' not registered`);
  }

  isRegistered(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  // Get all registered service keys
  getRegisteredKeys(): string[] {
    const keys = new Set<string>();
    
    for (const key of this.services.keys()) {
      keys.add(key);
    }
    
    for (const key of this.factories.keys()) {
      keys.add(key);
    }
    
    return Array.from(keys);
  }
}

// Global container instance
export const container = new DIContainer();

// Service keys constants
export const SERVICE_KEYS = {
  // Core services
  AUTH_SERVICE: 'authService',
  DATABASE_SERVICE: 'databaseService',
  STORAGE_SERVICE: 'storageService',
  PERMISSION_SERVICE: 'permissionService',
  
  // Business services
  AI_SERVICE: 'aiService',
  EMAIL_SERVICE: 'emailService',
  NOTIFICATION_SERVICE: 'notificationService',
  COMPANY_SERVICE: 'companyService',
  
  // Middleware and utilities
  PERMISSION_GUARD: 'permissionGuard',
  AUTH_MIDDLEWARE: 'authMiddleware',
} as const;

/**
 * Helper function to get all services as a typed container
 */
export function getServices(): ServiceContainer {
  return {
    authService: container.resolve<IAuthService>(SERVICE_KEYS.AUTH_SERVICE),
    databaseService: container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE),
    storageService: container.resolve<IStorageService>(SERVICE_KEYS.STORAGE_SERVICE),
    permissionService: container.resolve<IPermissionService>(SERVICE_KEYS.PERMISSION_SERVICE),
    aiService: container.resolve<IAIService>(SERVICE_KEYS.AI_SERVICE),
    emailService: container.resolve<IEmailService>(SERVICE_KEYS.EMAIL_SERVICE),
    notificationService: container.resolve<INotificationService>(SERVICE_KEYS.NOTIFICATION_SERVICE),
    companyService: container.resolve<ICompanyService>(SERVICE_KEYS.COMPANY_SERVICE),
  };
}

/**
 * Helper function to get a specific service
 */
export function getService<T>(key: string): T {
  return container.resolve<T>(key);
}

/**
 * Utility to inject services into route handlers
 */
export function withServices<T extends (...args: any[]) => any>(
  handler: (services: ServiceContainer, ...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    const services = getServices();
    return handler(services, ...args);
  }) as T;
}

/**
 * Decorator for injecting services into class methods
 */
export function injectServices<T extends (...args: any[]) => any>(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const services = getServices();
    return originalMethod.call(this, services, ...args);
  };
  
  return descriptor;
}

/**
 * Service factory interface for creating service instances
 */
export interface ServiceFactory<T> {
  create(): T;
  getType(): string;
}

/**
 * Abstract service factory base class
 */
export abstract class BaseServiceFactory<T> implements ServiceFactory<T> {
  abstract create(): T;
  abstract getType(): string;
}

/**
 * Service provider interface for registering services
 */
export interface ServiceProvider {
  register(container: ServiceRegistry): void;
  getName(): string;
}

/**
 * Service provider manager
 */
export class ServiceProviderManager {
  private providers: ServiceProvider[] = [];

  addProvider(provider: ServiceProvider): void {
    this.providers.push(provider);
  }

  registerAll(container: ServiceRegistry): void {
    for (const provider of this.providers) {
      try {
        provider.register(container);
        console.log(`✅ Registered ${provider.getName()} services`);
      } catch (error) {
        console.error(`❌ Failed to register ${provider.getName()} services:`, error);
        throw error;
      }
    }
  }

  getProviders(): ServiceProvider[] {
    return [...this.providers];
  }
}

/**
 * Service health checker
 */
export class ServiceHealthChecker {
  async checkService(key: string): Promise<{ healthy: boolean; error?: string }> {
    try {
      const service = container.resolve(key);
      
      // Basic health check - just try to resolve the service
      if (service) {
        return { healthy: true };
      } else {
        return { healthy: false, error: 'Service resolved to null/undefined' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async checkAllServices(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const results: Record<string, { healthy: boolean; error?: string }> = {};
    const serviceKeys = Object.values(SERVICE_KEYS);
    
    for (const key of serviceKeys) {
      results[key] = await this.checkService(key);
    }
    
    return results;
  }

  async getHealthSummary(): Promise<{ 
    totalServices: number; 
    healthyServices: number; 
    unhealthyServices: number; 
    details: Record<string, { healthy: boolean; error?: string }> 
  }> {
    const details = await this.checkAllServices();
    const totalServices = Object.keys(details).length;
    const healthyServices = Object.values(details).filter(result => result.healthy).length;
    const unhealthyServices = totalServices - healthyServices;
    
    return {
      totalServices,
      healthyServices,
      unhealthyServices,
      details
    };
  }
}

// Global service provider manager
export const serviceProviderManager = new ServiceProviderManager();

// Global health checker
export const serviceHealthChecker = new ServiceHealthChecker();