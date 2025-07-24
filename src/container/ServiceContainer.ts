import type { IAuthService } from '../interfaces/IAuthService.js';
import type { IDatabaseService } from '../interfaces/IDatabaseService.js';
import type { IAIService } from '../interfaces/IAIService.js';
import type { IFileService } from '../interfaces/IFileService.js';
import type { INotificationService } from '../interfaces/INotificationService.js';
import type { IEmailService } from '../interfaces/IEmailService.js';

export interface ServiceContainer {
  authService: IAuthService;
  databaseService: IDatabaseService;
  aiService: IAIService;
  fileService: IFileService;
  notificationService: INotificationService;
  emailService: IEmailService;
}

export interface ServiceRegistry {
  register<T>(key: string, factory: () => T): void;
  register<T>(key: string, instance: T): void;
  resolve<T>(key: string): T;
  isRegistered(key: string): boolean;
}

class DIContainer implements ServiceRegistry {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(key: string, instanceOrFactory: T | (() => T)): void {
    if (typeof instanceOrFactory === 'function') {
      this.factories.set(key, instanceOrFactory as () => T);
    } else {
      this.services.set(key, instanceOrFactory);
    }
  }

  resolve<T>(key: string): T {
    // Check if instance already exists
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if factory exists
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      this.services.set(key, instance);
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
  }
}

// Global container instance
export const container = new DIContainer();

// Service keys
export const SERVICE_KEYS = {
  AUTH_SERVICE: 'authService',
  DATABASE_SERVICE: 'databaseService',
  AI_SERVICE: 'aiService',
  FILE_SERVICE: 'fileService',
  NOTIFICATION_SERVICE: 'notificationService',
  EMAIL_SERVICE: 'emailService',
} as const;

// Helper function to get all services as a typed container
export function getServices(): ServiceContainer {
  return {
    authService: container.resolve<IAuthService>(SERVICE_KEYS.AUTH_SERVICE),
    databaseService: container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE),
    aiService: container.resolve<IAIService>(SERVICE_KEYS.AI_SERVICE),
    fileService: container.isRegistered(SERVICE_KEYS.FILE_SERVICE) 
      ? container.resolve<IFileService>(SERVICE_KEYS.FILE_SERVICE) 
      : null as any,
    notificationService: container.isRegistered(SERVICE_KEYS.NOTIFICATION_SERVICE) 
      ? container.resolve<INotificationService>(SERVICE_KEYS.NOTIFICATION_SERVICE) 
      : null as any,
    emailService: container.isRegistered(SERVICE_KEYS.EMAIL_SERVICE) 
      ? container.resolve<IEmailService>(SERVICE_KEYS.EMAIL_SERVICE) 
      : null as any,
  };
}

// Utility to inject services into route handlers
export function withServices<T extends (...args: any[]) => any>(
  handler: (services: ServiceContainer, ...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    const services = getServices();
    return handler(services, ...args);
  }) as T;
}