# MindSpace Service Layer Documentation

## Overview

The MindSpace backend implements a sophisticated **Service-Oriented Architecture** with clean separation between business logic and external dependencies. This documentation provides comprehensive coverage of all services, their interfaces, implementations, and integration patterns.

## Table of Contents

- [Service Architecture](#service-architecture)
- [Core Infrastructure Services](#core-infrastructure-services)
- [Business Logic Services](#business-logic-services)
- [Service Provider Pattern](#service-provider-pattern)
- [Dependency Injection](#dependency-injection)
- [Service Health Monitoring](#service-health-monitoring)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing and Mocking](#testing-and-mocking)

## Service Architecture

### Interface-First Design

All services implement well-defined interfaces that establish contracts independent of implementation details:

```typescript
// Service Interface (Contract)
interface IAuthService {
  login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }>;
  register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }>;
  // ... other methods
}

// Implementation (Adapter)
class AppwriteAuthAdapter implements IAuthService {
  // Appwrite-specific implementation
}

// Future flexibility
class FirebaseAuthAdapter implements IAuthService {
  // Firebase-specific implementation (can be swapped without changing business logic)
}
```

### Adapter Pattern Implementation

External services are wrapped in adapters that:
- Implement service interfaces
- Handle external API communication
- Transform data between internal and external formats
- Provide error handling and retry logic
- Enable service switching without code changes

### Service Categories

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                          │
├─────────────────────────────────────────────────────────────┤
│  🏗️ Core Infrastructure Services                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │    Auth     │  Database   │  Storage    │ Permission  │ │
│  │   Service   │   Service   │  Service    │  Service    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                             │
│  ⚙️ Business Logic Services                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │    AI       │    Email    │Notification │  Company    │ │
│  │  Service    │  Service    │  Service    │  Service    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  🔌 External Service Adapters                              │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │  Appwrite   │  Appwrite   │  Appwrite   │   Gemini    │ │
│  │    Auth     │  Database   │  Storage    │     AI      │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Infrastructure Services

### 1. Authentication Service (IAuthService)

**Purpose**: User authentication, session management, and OAuth2 integration

**Implementation**: `AppwriteAuthAdapter`

#### Key Features

```typescript
interface IAuthService {
  // Authentication
  register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }>;
  login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }>;
  logout(sessionId: string): Promise<void>;
  
  // Session Management
  validateSession(sessionId: string): Promise<{ user: User; session: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  
  // User Management
  getCurrentUser(sessionId: string): Promise<User>;
  updateProfile(sessionId: string, updates: ProfileUpdates): Promise<User>;
  updatePreferences(sessionId: string, preferences: UserPreferences): Promise<User>;
  
  // OAuth2 Support
  createOAuth2Session(provider: string): Promise<string>;
  handleOAuth2Callback(userId: string, secret: string): Promise<{ user: User; session: AuthTokens }>;
  
  // Admin Operations
  getUserById(userId: string): Promise<User>;
  updateUserRole(userId: string, role: UserRole, updatedBy: string): Promise<User>;
  listUsers(filters?: UserFilters): Promise<User[]>;
}
```

#### Implementation Details

##### JWT Token Management
```typescript
// Custom JWT implementation for session management
const session = createTokens({
  userId: user.$id,
  email: user.email,
  role: user.role,
  sessionId: appwriteSession.$id // Link to Appwrite session
});

// Token validation with blacklist checking
const payload = verifyToken(sessionId);
if (jwtBlacklist.isBlacklisted(sessionId)) {
  throw new Error('Session has been invalidated');
}
```

##### Dual Client Architecture
```typescript
class AppwriteAuthAdapter {
  private adminClient: Client;  // API key for server operations
  private authClient: Client;   // Session-based for user operations
  
  constructor() {
    // Admin client for user management operations
    this.adminClient = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);
    
    // Auth client for authentication operations
    this.authClient = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId);
  }
}
```

##### OAuth2 Integration
```typescript
async createOAuth2Session(provider: string): Promise<string> {
  const success = `${config.app.frontendUrl}/auth/callback`;
  const failure = `${config.app.frontendUrl}/auth/error`;
  
  return this.account.createOAuth2Token(provider, success, failure);
}

async handleOAuth2Callback(userId: string, secret: string): Promise<AuthResult> {
  // Get user via admin API to avoid scope issues
  const adminUser = await this.users.get(userId);
  
  // Auto-verify email for OAuth2 users
  const updateData = {
    emailVerified: true,
    role: 'INDIVIDUAL_USER',
    lastLogin: new Date().toISOString()
  };
  
  await this.users.updatePrefs(userId, updateData);
  
  // Generate JWT tokens
  const session = createTokens({
    userId: adminUser.$id,
    email: adminUser.email,
    role: userDomain.role
  });
  
  return { user: userDomain.toData(), session };
}
```

### 2. Database Service (IDatabaseService) 

**Purpose**: Data persistence, queries, and database operations abstraction

**Implementation**: `AppwriteDatabaseAdapter`

#### Interface Definition

```typescript
interface IDatabaseService {
  // Basic CRUD Operations
  create<T>(collection: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt'>): Promise<T>;
  read<T>(collection: string, documentId: string): Promise<T>;
  update<T>(collection: string, documentId: string, data: Partial<T>): Promise<T>;
  delete(collection: string, documentId: string): Promise<void>;
  
  // Query Operations
  list<T>(collection: string, queries?: DatabaseQuery[]): Promise<DatabaseListResponse<T>>;
  search<T>(collection: string, searchTerm: string, searchFields: string[]): Promise<DatabaseListResponse<T>>;
  count(collection: string, queries?: DatabaseQuery[]): Promise<number>;
  exists(collection: string, documentId: string): Promise<boolean>;
  
  // Batch Operations
  batchCreate<T>(collection: string, documents: Omit<T, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<T[]>;
  batchUpdate<T>(collection: string, updates: BatchUpdate<T>[]): Promise<T[]>;
  batchDelete(collection: string, documentIds: string[]): Promise<void>;
  
  // Schema Management
  createCollection(collectionId: string, name: string): Promise<void>;
  deleteCollection(collectionId: string): Promise<void>;
  listCollections(): Promise<DatabaseCollection[]>;
  createIndex(collectionId: string, key: string, type: DatabaseIndexType, attributes: string[]): Promise<void>;
  
  // Advanced Operations
  transaction<T>(operations: DatabaseOperation[]): Promise<T[]>;
}
```

#### Query Building System

```typescript
interface DatabaseQuery {
  field: string;
  operator: 'equal' | 'notEqual' | 'less' | 'greater' | 'contains' | 'search' | 'between';
  value: any;
}

// Query builder implementation
private buildAppwriteQueries(queries: DatabaseQuery[]): string[] {
  return queries.map(query => {
    switch (query.operator) {
      case 'equal':
        return Query.equal(query.field, query.value);
      case 'contains':
        return Query.contains(query.field, query.value);
      case 'between':
        return Query.between(query.field, query.value[0], query.value[1]);
      // ... other operators
    }
  });
}

// Usage example
const userQueries: DatabaseQuery[] = [
  { field: 'role', operator: 'equal', value: 'COMPANY_ADMIN' },
  { field: 'isActive', operator: 'equal', value: true },
  { field: 'companyId', operator: 'equal', value: companyId }
];

const users = await databaseService.list<User>('users', userQueries);
```

#### Collection Management

```typescript
// Dynamic collection mapping
private getCollectionId(collection: string): string {
  const collectionMap: Record<string, string> = {
    users: config.appwrite.collections.users,
    companies: config.appwrite.collections.companies,
    journals: config.appwrite.collections.journals,
    moods: config.appwrite.collections.moods,
    notifications: config.appwrite.collections.notifications,
    permission_rules: 'permission_rules',
    permission_audit: 'permission_audit'
  };
  
  return collectionMap[collection] || collection;
}

// Index management for performance
async createIndex(collectionId: string, key: string, type: DatabaseIndexType, attributes: string[]): Promise<void> {
  const indexType = this.mapIndexType(type);
  
  await this.databases.createIndex(
    config.appwrite.databaseId,
    collectionId,
    key,
    indexType,
    attributes
  );
}
```

### 3. Storage Service (IStorageService)

**Purpose**: File upload, management, and serving

**Implementation**: `AppwriteStorageAdapter`

#### Interface Definition

```typescript
interface IStorageService {
  // File Operations
  uploadFile(bucketId: string, file: File, permissions?: string[]): Promise<StorageFile>;
  downloadFile(bucketId: string, fileId: string): Promise<Buffer>;
  deleteFile(bucketId: string, fileId: string): Promise<void>;
  
  // File Management
  getFilePreview(bucketId: string, fileId: string, options?: PreviewOptions): Promise<string>;
  getFileView(bucketId: string, fileId: string): Promise<string>;
  listFiles(bucketId: string, queries?: StorageQuery[]): Promise<StorageFileList>;
  
  // Bucket Management
  createBucket(bucketId: string, name: string, permissions?: string[]): Promise<void>;
  deleteBucket(bucketId: string): Promise<void>;
  listBuckets(): Promise<StorageBucket[]>;
}
```

### 4. Permission Service (IPermissionService)

**Purpose**: Authorization, role management, and access control

**Implementation**: `PermissionService`

For detailed permission system documentation, see [Permissions Documentation](./permissions.md).

#### Key Capabilities

```typescript
interface IPermissionService {
  // Permission Checking
  hasPermission(user: User, permission: Permission): Promise<boolean>;
  hasAnyPermission(user: User, permissions: Permission[]): Promise<boolean>;
  canAccessResource(user: User, resourceType: string, resourceId: string, action: string): Promise<boolean>;
  
  // Role Management
  updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<void>;
  getRolePermissions(role: UserRole): Permission[];
  
  // Dynamic Rules (ABAC)
  evaluateRule(rule: PermissionRule, context: PermissionContext): Promise<boolean>;
  createRule(rule: PermissionRule, createdBy: string): Promise<string>;
  
  // Audit and Compliance
  logPermissionCheck(userId: string, permission: Permission, result: boolean, context?: any): Promise<void>;
  getPermissionAuditLog(userId?: string, startDate?: Date, endDate?: Date): Promise<PermissionAuditEntry[]>;
}
```

## Business Logic Services

### 1. AI Service (IAIService)

**Purpose**: AI-powered content analysis, insights generation, and intelligent features

**Implementation**: `GeminiAIService`

#### Interface Definition

```typescript
interface IAIService {
  // Content Generation
  generateResponse(request: AIRequest): Promise<AIResponse>;
  chat(message: string, context?: string): Promise<string>;
  
  // Analysis Capabilities
  analyzeJournalEntry(journalEntry: JournalEntry): Promise<JournalInsights>;
  generateMoodInsights(moodData: MoodEntry[]): Promise<MoodInsights>;
  
  // Wellness Features
  chatWithAI(message: string, userContext?: any): Promise<AIResponse>;
  generateWellnessContent(type: string, userPreferences?: any): Promise<WellnessContent>;
  
  // Service Management
  isAvailable(): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}
```

#### Implementation Details

##### Journal Analysis
```typescript
async analyzeJournalEntry(journalEntry: any): Promise<JournalInsights> {
  const prompt = `
    Analyze this journal entry and return JSON with:
    - sentiment: number (-1 to 1)
    - emotions: string[] (detected emotions)
    - themes: string[] (key topics/themes)
    - suggestions: string[] (wellness recommendations)
    
    Content: ${journalEntry.content}
    Mood: ${journalEntry.mood?.current} (${journalEntry.mood?.intensity}/10)
    
    Return only valid JSON.
  `;

  const result = await this.model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    logger.warn('Failed to parse AI analysis as JSON');
  }

  // Fallback response
  return {
    sentiment: 0,
    emotions: ['neutral'],
    themes: ['general'],
    suggestions: ['Continue journaling regularly']
  };
}
```

##### Mood Insights Generation
```typescript
async generateMoodInsights(moodData: any[]): Promise<MoodInsights> {
  if (!moodData || moodData.length === 0) {
    return {
      trends: { direction: 'stable', confidence: 0 },
      patterns: { bestTimes: [], worstTimes: [], triggers: [] },
      recommendations: ['Start logging moods regularly'],
      summary: 'Insufficient data for insights'
    };
  }

  const moodSummary = moodData.slice(0, 10).map(mood => 
    `${mood.current} (${mood.intensity}/10)`
  ).join(', ');

  const prompt = `
    Analyze mood data: ${moodSummary}
    
    Return JSON with:
    - trends: { direction: 'improving'|'stable'|'declining', confidence: 0-1 }
    - patterns: { bestTimes: [], worstTimes: [], triggers: [] }
    - recommendations: string[]
    - summary: string
  `;

  // Process with error handling and fallbacks
  return this.processAIResponse(prompt, defaultMoodInsights);
}
```

##### Contextual AI Chat
```typescript
async chatWithAI(message: string, userContext?: any): Promise<AIResponse> {
  let prompt = message;
  let contextUsed = false;

  if (userContext) {
    // Include relevant user context for personalized responses
    const contextStr = JSON.stringify({
      recentMoods: userContext.recentMoods?.slice(0, 3),
      preferences: userContext.preferences,
      goals: userContext.goals
    });
    
    prompt = `Context: ${contextStr}\n\nUser message: ${message}`;
    contextUsed = true;
  }

  const result = await this.model.generateContent(prompt);
  const response = await result.response;
  
  return {
    response: response.text(),
    model: 'gemini-pro',
    timestamp: new Date().toISOString(),
    contextUsed
  };
}
```

### 2. Email Service (IEmailService)

**Purpose**: Transactional emails, notifications, and communication

**Implementation**: `EmailService` (Nodemailer)

#### Interface Definition

```typescript
interface IEmailService {
  // Email Operations
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void>;
  sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<void>;
  
  // Service Management
  testConnection(): Promise<boolean>;
}
```

#### Email Templates

##### Welcome Email Template
```typescript
private getWelcomeEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 30px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; }
          .button { background: #667eea; color: white; padding: 12px 30px; 
                   text-decoration: none; border-radius: 5px; }
          .features { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌟 Welcome to MindSpace, ${name}!</h1>
          <p>Your journey to better mental wellness starts here</p>
        </div>
        
        <div class="content">
          <h2>What's Next?</h2>
          <p>We're thrilled to have you join our community...</p>
          
          <div class="features">
            <div class="feature">
              <h3>📝 Smart Journaling</h3>
              <p>Express thoughts and track emotional patterns</p>
            </div>
            <div class="feature">
              <h3>🤖 AI Wellness Coach</h3>
              <p>Get personalized insights and recommendations</p>
            </div>
          </div>
          
          <a href="${config.app.frontendUrl}/login" class="button">Get Started</a>
        </div>
      </body>
    </html>
  `;
}
```

##### Error Handling and Reliability
```typescript
async sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    const mailOptions = {
      from: `"MindSpace" <${config.email.from}>`,
      to,
      subject: 'Welcome to MindSpace - Your Mental Wellness Journey Begins! 🌟',
      html: this.getWelcomeEmailTemplate(name),
    };

    await this.transporter.sendMail(mailOptions);
    
    logger.info('Welcome email sent successfully', { to, name });
  } catch (error) {
    logger.error('Failed to send welcome email', { to, name, error });
    // Don't throw error - email failure shouldn't block registration
  }
}

async testConnection(): Promise<boolean> {
  try {
    await this.transporter.verify();
    logger.info('Email service connection verified');
    return true;
  } catch (error) {
    logger.error('Email service connection failed', { error });
    return false;
  }
}
```

### 3. Company Service (ICompanyService)

**Purpose**: Organization management, team features, and company administration

#### Interface Definition

```typescript
interface ICompanyService {
  // Company Management
  createCompany(companyData: CreateCompanyRequest, createdBy: string): Promise<Company>;
  updateCompany(companyId: string, updates: CompanyUpdates, updatedBy: string): Promise<Company>;
  deleteCompany(companyId: string, deletedBy: string): Promise<void>;
  getCompany(companyId: string): Promise<Company>;
  listCompanies(filters?: CompanyFilters): Promise<Company[]>;
  
  // User Management
  inviteUser(companyId: string, invitation: UserInvitation, invitedBy: string): Promise<void>;
  removeUser(companyId: string, userId: string, removedBy: string): Promise<void>;
  listCompanyUsers(companyId: string, filters?: UserFilters): Promise<User[]>;
  
  // Analytics and Reporting
  getCompanyAnalytics(companyId: string, dateRange: DateRange): Promise<CompanyAnalytics>;
  generateCompanyReport(companyId: string, reportType: string): Promise<CompanyReport>;
}
```

### 4. Notification Service (INotificationService)

**Purpose**: Push notifications, alerts, and user engagement

#### Interface Definition

```typescript
interface INotificationService {
  // Notification Operations
  sendNotification(userId: string, notification: NotificationData): Promise<void>;
  sendBulkNotifications(userIds: string[], notification: NotificationData): Promise<void>;
  
  // Notification Management
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  
  // Queries
  getUserNotifications(userId: string, filters?: NotificationFilters): Promise<Notification[]>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Preferences
  updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<void>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
}
```

## Service Provider Pattern

### Provider Architecture

Service providers organize and register related services in the dependency injection container:

```typescript
// Base Service Provider Interface
interface ServiceProvider {
  register(container: ServiceRegistry): void;
  getName(): string;
}

// Appwrite Services Provider
class AppwriteServiceProvider implements ServiceProvider {
  register(container: ServiceRegistry): void {
    // Register core infrastructure services
    container.register(SERVICE_KEYS.AUTH_SERVICE, () => new AppwriteAuthAdapter());
    container.register(SERVICE_KEYS.DATABASE_SERVICE, () => new AppwriteDatabaseAdapter());
    container.register(SERVICE_KEYS.STORAGE_SERVICE, () => new AppwriteStorageAdapter());
  }
  
  getName(): string {
    return 'AppwriteServiceProvider';
  }
}

// Business Logic Services Provider
class BusinessServiceProvider implements ServiceProvider {
  register(container: ServiceRegistry): void {
    // Register business logic services with dependencies
    container.register(SERVICE_KEYS.PERMISSION_SERVICE, () => {
      const databaseService = container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE);
      return new PermissionService(databaseService);
    });
    
    container.register(SERVICE_KEYS.AI_SERVICE, () => new GeminiAIService());
    container.register(SERVICE_KEYS.EMAIL_SERVICE, () => new EmailService());
    container.register(SERVICE_KEYS.COMPANY_SERVICE, () => {
      const databaseService = container.resolve<IDatabaseService>(SERVICE_KEYS.DATABASE_SERVICE);
      const permissionService = container.resolve<IPermissionService>(SERVICE_KEYS.PERMISSION_SERVICE);
      return new CompanyService(databaseService, permissionService);
    });
  }
  
  getName(): string {
    return 'BusinessServiceProvider';
  }
}
```

### Service Registration Process

```typescript
// Bootstrap service registration
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
```

## Dependency Injection

### Container Implementation

```typescript
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

  resolve<T>(key: string): T {
    // Check singleton cache
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // Check direct instances
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Create from factory
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      this.singletons.set(key, instance); // Cache as singleton
      return instance as T;
    }

    throw new Error(`Service '${key}' not registered`);
  }
}
```

### Service Keys Constants

```typescript
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
} as const;
```

### Service Resolution Helpers

```typescript
// Typed service container getter
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

// Service injection utility for route handlers
export function withServices<T extends (...args: any[]) => any>(
  handler: (services: ServiceContainer, ...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    const services = getServices();
    return handler(services, ...args);
  }) as T;
}
```

## Service Health Monitoring

### Health Check System

```typescript
export class ServiceHealthChecker {
  async checkService(key: string): Promise<{ healthy: boolean; error?: string }> {
    try {
      const service = container.resolve(key);
      
      // Basic health check - service resolution
      if (service) {
        // Extended health check for services that support it
        if ('healthCheck' in service) {
          const isHealthy = await service.healthCheck();
          return { healthy: isHealthy };
        }
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

  async getHealthSummary(): Promise<HealthSummary> {
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
```

### Health Monitoring Integration

```typescript
// Health endpoint with service checking
app.get('/health', async () => {
  try {
    const healthSummary = await serviceHealthChecker.getHealthSummary();
    
    const health = {
      status: healthSummary.unhealthyServices === 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        total: healthSummary.totalServices,
        healthy: healthSummary.healthyServices,
        unhealthy: healthSummary.unhealthyServices,
        details: healthSummary.details
      }
    };

    const status = healthSummary.unhealthyServices === 0 ? 200 : 503;
    return createSuccessResponse(status, health);
  } catch (error) {
    return createErrorResponse(503, 'Health check failed');
  }
});
```

## Error Handling Patterns

### Standardized Error Handling

```typescript
// Service-level error handling
class AppwriteAuthAdapter {
  async login(credentials: LoginRequest): Promise<AuthResult> {
    try {
      // Service operation
      const session = await this.account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );
      
      return this.processLoginResult(session);
    } catch (error) {
      logger.error('Login failed:', error);
      
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      
      throw error;
    }
  }

  private mapAppwriteError(error: AppwriteException): string {
    switch (error.code) {
      case 401:
        return 'Invalid credentials';
      case 409:
        return 'User already exists';
      case 429:
        return 'Too many requests. Please try again later';
      default:
        return error.message || 'Authentication failed';
    }
  }
}
```

### Error Propagation Strategy

```typescript
// Controller error handling
class AuthController {
  async login(context: any) {
    try {
      const validatedData = this.validateRequestBody(loginSchema, context.body);
      const result = await this.services.authService.login(validatedData);
      
      return this.success(result, SUCCESS_MESSAGES.LOGIN_SUCCESS);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials')) {
          return this.error(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
        }
      }
      
      return this.handleBusinessError(error as Error, context.set);
    }
  }
}
```

## Testing and Mocking

### Service Interface Mocking

```typescript
// Mock implementation for testing
class MockAuthService implements IAuthService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthTokens> = new Map();

  async login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }> {
    const user = Array.from(this.users.values())
      .find(u => u.email === credentials.email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const session: AuthTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };

    this.sessions.set(session.accessToken, session);

    return { user, session };
  }

  // ... implement other interface methods
}

// Test setup
describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: MockAuthService;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
    authController = new AuthController({
      authService: mockAuthService,
      // ... other mock services
    });
  });

  it('should login user with valid credentials', async () => {
    // Test implementation
  });
});
```

### Service Integration Testing

```typescript
// Integration test with real service dependencies
describe('PermissionService Integration', () => {
  let permissionService: PermissionService;
  let databaseService: IDatabaseService;

  beforeEach(async () => {
    // Use test database
    databaseService = new AppwriteDatabaseAdapter();
    permissionService = new PermissionService(databaseService);
    
    // Setup test data
    await setupTestData();
  });

  it('should check user permissions correctly', async () => {
    const user = await createTestUser({ role: 'COMPANY_ADMIN' });
    const hasPermission = await permissionService.hasPermission(user, 'manage_company');
    
    expect(hasPermission).toBe(true);
  });
});
```

---

**Related Documentation**:
- [Architecture Overview](./architecture.md) - System design and patterns
- [Permission System](./permissions.md) - Authorization and access control
- [API Reference](./api-reference.md) - Service-backed endpoints
- [Configuration Guide](./config.md) - Service configuration