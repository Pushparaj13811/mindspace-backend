# MindSpace Backend Architecture

## Overview

MindSpace is an AI-powered mental wellness platform built with a **Clean Architecture** approach using modern TypeScript technologies. The backend follows a layered, service-oriented architecture with dependency injection, granular permissions, and adapter patterns for maximum maintainability and extensibility.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Architecture Principles](#architecture-principles)
- [System Architecture](#system-architecture)
- [Layer Architecture](#layer-architecture)
- [Core Components](#core-components)
- [Authentication & Authorization](#authentication--authorization)
- [Service Layer](#service-layer)
- [Data Flow](#data-flow)
- [Scalability Considerations](#scalability-considerations)
- [Security Architecture](#security-architecture)

## Technology Stack

### Core Technologies
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Framework**: Elysia (Fast web framework for Bun)
- **Language**: TypeScript 5.3+ (strict mode)
- **Backend-as-a-Service**: Appwrite (database, authentication, storage)

### Key Dependencies
- **API Documentation**: Swagger/OpenAPI 3.0 (`@elysiajs/swagger`)
- **Authentication**: JWT tokens (`@elysiajs/jwt`, `jsonwebtoken`)
- **Validation**: Zod schema validation
- **Logging**: Winston structured logging
- **CORS**: Configurable cross-origin requests (`@elysiajs/cors`)
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Gemini)
- **Email**: Nodemailer SMTP support
- **Rate Limiting**: `rate-limiter-flexible`
- **Image Processing**: Sharp
- **Security**: bcryptjs for password hashing

## Architecture Principles

### 1. Clean Architecture
- **Separation of Concerns**: Business logic isolated from external dependencies
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Interface Segregation**: Service interfaces define contracts, not implementations

### 2. SOLID Principles
- **Single Responsibility**: Each class/service has one reason to change
- **Open/Closed**: Extensions through interfaces, not modifications
- **Liskov Substitution**: Service implementations are interchangeable
- **Interface Segregation**: Focused, client-specific interfaces
- **Dependency Inversion**: Abstract dependencies, concrete implementations

### 3. Domain-Driven Design
- **Domain Entities**: Rich business objects with behavior (`User`, `Permission`)
- **Value Objects**: Immutable data containers
- **Domain Services**: Complex business logic coordination
- **Repository Pattern**: Data access abstraction

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MindSpace Backend                        │
├─────────────────────────────────────────────────────────────┤
│  🌐 API Layer (Elysia Routes)                              │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────────┐   │
│  │  Auth   │Journal │  Mood   │   AI    │  Company    │   │
│  │ Routes  │ Routes │ Routes  │ Routes  │   Routes    │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  🛡️ Middleware Layer                                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │    Auth     │ Permission  │Rate Limiting│    CORS     │ │
│  │ Middleware  │   Guard     │ Middleware  │ Middleware  │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  🎮 Controller Layer                                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │    Auth     │   Journal   │    Mood     │     AI      │ │
│  │ Controller  │ Controller  │ Controller  │ Controller  │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ⚙️ Service Layer (Business Logic)                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │    Auth     │  Database   │  Storage    │   Email     │ │
│  │   Service   │   Service   │  Service    │  Service    │ │
│  ├─────────────┼─────────────┼─────────────┼─────────────┤ │
│  │    AI       │ Permission  │Notification │  Company    │ │
│  │  Service    │  Service    │  Service    │  Service    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  🔌 Adapter Layer                                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │  Appwrite   │  Appwrite   │  Appwrite   │  Nodemailer │ │
│  │    Auth     │  Database   │  Storage    │    Email    │ │
│  │   Adapter   │   Adapter   │   Adapter   │   Adapter   │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  🏗️ Core Layer                                             │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │   Domain    │ Interfaces  │ Container   │ Providers   │ │
│  │  Entities   │    (DI)     │  (DI)       │    (DI)     │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  💾 External Services                                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │  Appwrite   │   OpenAI    │  Anthropic  │   Gmail     │ │
│  │  (BaaS)     │    API      │    API      │   SMTP      │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Layer Architecture

### 1. API Layer (Routes)
**Location**: `src/routes/`

- **Purpose**: HTTP endpoint definitions and request routing
- **Components**:
  - `auth.ts`: Authentication endpoints (login, register, OAuth2)
  - `journal.ts`: Journal management endpoints
  - `mood.ts`: Mood tracking endpoints
  - `ai.ts`: AI integration endpoints
  - `company.ts`: Company management endpoints

**Key Features**:
- RESTful API design
- OpenAPI/Swagger documentation
- Request validation with Zod schemas
- Standardized response formats

### 2. Middleware Layer
**Location**: `src/core/middleware/`

- **AuthenticationMiddleware**: JWT token validation and user context
- **PermissionGuard**: Granular permission checking and authorization
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS**: Cross-origin request handling

### 3. Controller Layer
**Location**: `src/controllers/`

- **Purpose**: Request processing, validation, and response formatting
- **Base Controller**: Common functionality (error handling, validation, logging)
- **Specialized Controllers**: Domain-specific request handling

**Key Features**:
- Input validation and sanitization
- Business logic orchestration
- Structured error handling
- Audit logging integration

### 4. Service Layer
**Location**: `src/services/`, `src/core/interfaces/`

- **Purpose**: Business logic implementation and external service integration
- **Core Services**:
  - `IAuthService`: User authentication and session management
  - `IDatabaseService`: Data persistence operations
  - `IStorageService`: File upload and management
  - `IPermissionService`: Access control and authorization
  - `IAIService`: AI model integration and processing
  - `IEmailService`: Email communication
  - `INotificationService`: Push notifications and alerts
  - `ICompanyService`: Organization management

### 5. Adapter Layer
**Location**: `src/services/*/`

- **Purpose**: External service integration with clean interfaces
- **Appwrite Adapters**:
  - `AppwriteAuthAdapter`: Authentication service implementation
  - `AppwriteDatabaseAdapter`: Database operations
  - `AppwriteStorageAdapter`: File storage operations
- **Other Adapters**:
  - Email service adapters (Nodemailer)
  - AI service adapters (OpenAI, Anthropic, Gemini)

### 6. Core Layer
**Location**: `src/core/`

- **Domain Entities**: Business objects with rich behavior
  - `User`: User management and validation
  - `Permission`: Access control and role management
- **Interfaces**: Service contracts and abstractions
- **Dependency Injection**: Service container and providers
- **Types**: TypeScript type definitions

## Core Components

### 1. Dependency Injection Container
**Location**: `src/core/container/ServiceContainer.ts`

```typescript
interface ServiceContainer {
  authService: IAuthService;
  databaseService: IDatabaseService;
  storageService: IStorageService;
  permissionService: IPermissionService;
  aiService: IAIService;
  emailService: IEmailService;
  notificationService: INotificationService;
  companyService: ICompanyService;
}
```

**Features**:
- Singleton and factory registration
- Service lifecycle management
- Health checking and monitoring
- Provider-based service registration

### 2. Service Providers
**Location**: `src/core/providers/`

- **AppwriteServiceProvider**: Registers Appwrite-based services
- **BusinessServiceProvider**: Registers business logic services
- **Pattern**: Organizes service registration by concern

### 3. Bootstrap Process
**Location**: `src/bootstrap.ts`

```typescript
export async function bootstrap(): Promise<void> {
  // 1. Validate environment configuration
  validateConfig();
  
  // 2. Register services in DI container
  await registerServices();
  
  // 3. Test service connections
  await testServiceConnections();
}
```

## Authentication & Authorization

### Authentication Flow

1. **Registration/Login**:
   - User provides credentials
   - Appwrite handles authentication
   - JWT tokens generated for session management
   - User data stored in preferences

2. **Session Management**:
   - Access tokens (short-lived, 1 hour)
   - Refresh tokens (long-lived, 7 days)
   - Token blacklisting for logout
   - Automatic token refresh

3. **OAuth2 Support**:
   - Google OAuth2 integration
   - Redirect-based flow
   - Automatic user provisioning

### Authorization System

#### Role-Based Access Control (RBAC)
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',      // Platform management
  COMPANY_ADMIN = 'COMPANY_ADMIN',   // Company management
  COMPANY_MANAGER = 'COMPANY_MANAGER', // Department management
  COMPANY_USER = 'COMPANY_USER',     // Basic company features
  INDIVIDUAL_USER = 'INDIVIDUAL_USER' // Personal use only
}
```

#### Granular Permissions
- **Platform**: `manage_platform`, `view_platform_analytics`, `manage_companies`
- **Company**: `manage_company`, `view_company_analytics`, `manage_company_users`
- **User**: `manage_profile`, `create_journal`, `view_own_data`, `delete_account`

#### Permission Evaluation
```typescript
class Permission {
  static hasPermission(user: User, permission: PermissionType): boolean;
  static canAccessCompany(user: User, companyId: string): boolean;
  static canManageUser(manager: User, targetUser: User): boolean;
}
```

## Service Layer

### Service Architecture Pattern
- **Interface-first**: All services implement contracts
- **Adapter Pattern**: External services wrapped in adapters
- **Dependency Injection**: Services injected into controllers
- **Health Monitoring**: Service health checking and reporting

### Core Services

#### AuthService (IAuthService)
```typescript
interface IAuthService {
  // Authentication
  register(userData: RegisterRequest): Promise<{ user: User; session: AuthTokens }>;
  login(credentials: LoginRequest): Promise<{ user: User; session: AuthTokens }>;
  logout(sessionId: string): Promise<void>;
  
  // Session management
  validateSession(sessionId: string): Promise<{ user: User; session: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  
  // OAuth2
  createOAuth2Session(provider: string): Promise<string>;
  handleOAuth2Callback(userId: string, secret: string): Promise<{ user: User; session: AuthTokens }>;
}
```

#### DatabaseService (IDatabaseService)
- CRUD operations abstraction
- Query building and filtering
- Transaction management
- Connection pooling

#### PermissionService (IPermissionService)
- Permission evaluation
- Role management
- Access control rules
- Audit logging

## Data Flow

### Request Processing Flow

1. **HTTP Request** → Elysia Router
2. **Route Handler** → Controller Method
3. **Middleware Chain**:
   - Authentication (extract user)
   - Authorization (check permissions)
   - Rate limiting
   - Request validation
4. **Controller** → Service Layer
5. **Service Layer** → Adapter Layer
6. **External Service** (Appwrite, AI APIs)
7. **Response** ← Service ← Controller ← Route

### Authentication Flow
```
Client Request
    ↓
JWT Token Validation
    ↓
User Context Injection
    ↓
Permission Checking
    ↓
Business Logic Execution
    ↓
Response with Fresh Tokens
```

### Permission Checking Flow
```
User Request → Permission Guard
    ↓
Role-based Check → Permission Domain
    ↓
Resource-based Check → Business Rules
    ↓
Allow/Deny Decision → Audit Log
    ↓
Continue/Block Request
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: All session data in JWT tokens
- **Service Separation**: Independent service scaling
- **Database Scaling**: Appwrite's built-in scaling
- **Load Balancing**: Ready for multi-instance deployment

### Performance Optimizations
- **Bun Runtime**: Faster than Node.js
- **Service Caching**: Built-in service resolution caching
- **Connection Pooling**: Efficient resource utilization
- **Async Operations**: Non-blocking I/O throughout

### Monitoring & Health Checks
- **Service Health Checker**: Monitor all service dependencies
- **Structured Logging**: Winston with contextual information
- **Audit Trail**: Complete permission and action logging
- **Error Tracking**: Comprehensive error handling and logging

## Security Architecture

### Authentication Security
- **JWT Tokens**: Signed and verified
- **Token Blacklisting**: Immediate revocation
- **Rate Limiting**: Prevent brute force attacks
- **Session Management**: Secure token lifecycle

### Authorization Security
- **Principle of Least Privilege**: Minimal required permissions
- **Role Hierarchy**: Clear privilege escalation rules
- **Resource-based Access**: Company and data isolation
- **Audit Logging**: Complete action tracking

### Data Security
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Appwrite ORM protection
- **Password Security**: bcrypt hashing
- **CORS Configuration**: Controlled cross-origin access

### Infrastructure Security
- **Environment Variables**: Secure configuration management
- **TLS/HTTPS**: Encrypted communication
- **API Key Management**: Secure external service integration
- **Secret Management**: No hardcoded secrets

## Configuration Management

### Environment-based Configuration
**Location**: `src/utils/config.ts`

```typescript
export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expireTime: process.env.JWT_EXPIRE_TIME || '1h',
    refreshExpireTime: process.env.JWT_REFRESH_EXPIRE_TIME || '7d',
  },
  
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID,
  },
  
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY,
  },
  
  email: {
    host: process.env.EMAIL_HOST,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  }
};
```

### Configuration Validation
- **Required Variables**: Validated at startup
- **Type Safety**: TypeScript configuration types
- **Environment-specific**: Development vs production settings
- **Fallback Values**: Sensible defaults where appropriate

---

**Next Documents**: 
- [Folder Structure](./folder-structure.md) - Detailed codebase organization
- [Permissions System](./permissions.md) - Complete authorization documentation
- [API Reference](./api-reference.md) - Comprehensive endpoint documentation
- [Services Documentation](./services.md) - Service layer deep dive