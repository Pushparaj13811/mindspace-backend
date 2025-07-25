import type { ServiceProvider, ServiceRegistry } from '../container/ServiceContainer.js';
import { SERVICE_KEYS } from '../container/ServiceContainer.js';
import type { IDatabaseService } from '../interfaces/index.js';

// Import existing business services
import { GeminiAIService } from '../../services/GeminiAIService.js';
import { EmailService } from '../../services/EmailService.js';
import { NotificationService } from '../../services/NotificationService.js';
import { CompanyService } from '../../services/CompanyService.js';

/**
 * Business service provider
 * Registers all business logic services
 */
export class BusinessServiceProvider implements ServiceProvider {
  getName(): string {
    return 'Business Services';
  }

  register(container: ServiceRegistry): void {
    // Register AI service
    container.register(SERVICE_KEYS.AI_SERVICE, () => new GeminiAIService());

    // Register email service
    container.register(SERVICE_KEYS.EMAIL_SERVICE, () => new EmailService());

    // Register notification service
    container.register(SERVICE_KEYS.NOTIFICATION_SERVICE, () => new NotificationService());

    // Register company service with database dependency
    container.register(SERVICE_KEYS.COMPANY_SERVICE, () => {
      const databaseService = container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE);
      return new CompanyService(databaseService);
    });
  }
}