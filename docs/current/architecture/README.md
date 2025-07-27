# MindSpace Backend Architecture

## 🏗️ System Architecture Overview

The MindSpace backend implements Clean Architecture principles with a service-oriented design, providing a scalable and maintainable mental wellness platform API.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  Routes (Elysia.js)     │  Controllers (MVC)   │  Middleware        │
│  - auth.ts              │  - AuthController     │  - Authentication  │
│  - journal.ts           │  - JournalController  │  - Permissions     │
│  - mood.ts              │  - MoodController     │  - Validation      │
│  - ai.ts                │  - AIController       │  - CORS            │
│  - company.ts           │  - CompanyController  │  - Rate Limiting   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Application Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│  Business Services      │  Domain Services     │  Utilities         │
│  - AuthService          │  - PermissionService │  - Validation      │
│  - CompanyService       │  - User Domain       │  - JWT Helper      │
│  - EmailService         │  - Permission Domain │  - Logger          │
│  - NotificationService  │                      │  - Config          │
│  - GeminiAIService      │                      │  - Error Handler   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                           │
├─────────────────────────────────────────────────────────────────────┤
│  Service Adapters       │  External Services   │  Data Models       │
│  - AppwriteAuthAdapter  │  - Appwrite DB       │  - UserModel       │
│  - AppwriteDBAdapter    │  - Google OAuth2     │  - JournalModel    │
│  - AppwriteStorage      │  - Google Gemini AI  │  - MoodModel       │
│                         │  - Email Provider    │  - CompanyModel    │
└─────────────────────────────────────────────────────────────────────┘
```

## 🏛️ Clean Architecture Layers

### 1. **Presentation Layer**
**Location**: `/src/routes/*` and `/src/controllers/*`

- **Routes**: Define API endpoints using Elysia.js with OpenAPI documentation
- **Controllers**: Handle HTTP requests, coordinate business logic, return responses
- **Middleware**: Authentication, authorization, validation, error handling

**Key Files**:
- `src/routes/auth.ts` - Authentication endpoints
- `src/controllers/AuthController.ts` - Auth business logic coordination
- `src/core/middleware/AuthenticationMiddleware.ts` - JWT validation

### 2. **Application Layer** 
**Location**: `/src/core/services/*` and `/src/services/*`

- **Business Services**: Core application logic and coordination
- **Domain Services**: Domain-specific business rules and validation
- **Use Cases**: Application-specific business operations

**Key Files**:
- `src/services/auth/AppwriteAuthAdapter.ts` - Authentication implementation
- `src/core/services/PermissionService.ts` - Permission management
- `src/core/domain/User.ts` - User business logic

### 3. **Infrastructure Layer**
**Location**: `/src/services/*` and `/src/models/*`

- **External Service Adapters**: Wrap external APIs (Appwrite, Google, etc.)
- **Data Models**: Entity definitions and data mapping
- **Configuration**: Environment and service configuration

**Key Files**:
- `src/services/database/AppwriteDatabaseAdapter.ts` - Database operations
- `src/models/UserModel.ts` - User data model
- `src/utils/config.ts` - Configuration management

## 🔧 Tech Stack & Dependencies

### Core Framework
- **Runtime**: Bun 1.x (JavaScript runtime)
- **Framework**: Elysia.js (TypeScript-first web framework)
- **Language**: TypeScript 5.x with strict mode

### Backend Services
- **Database**: Appwrite (Backend-as-a-Service)
- **Authentication**: JWT + Appwrite Auth + Google OAuth2
- **File Storage**: Appwrite Storage
- **AI Integration**: Google Gemini AI

### Development Tools
- **Validation**: Zod (TypeScript-first schema validation)
- **Logging**: Winston (structured logging)
- **Testing**: Bun Test (built-in test runner)
- **Documentation**: OpenAPI/Swagger integration

## 🏗️ Key Architectural Patterns

### 1. **Dependency Injection Container**
**Location**: `/src/core/container/ServiceContainer.ts`

Centralizes service instantiation and manages dependencies:

```typescript
export const SERVICE_KEYS = {
  AUTH_SERVICE: 'authService',
  DATABASE_SERVICE: 'databaseService',
  PERMISSION_SERVICE: 'permissionService',
  // ... more services
} as const;

// Usage in controllers
const authService = getService<IAuthService>(SERVICE_KEYS.AUTH_SERVICE);
```

### 2. **Service Adapter Pattern**
External services are wrapped in adapters implementing defined interfaces:

```typescript
// Interface
interface IAuthService {
  register(userData: RegisterRequest): Promise<{user: User; session: AuthTokens}>;
  login(credentials: LoginRequest): Promise<{user: User; session: AuthTokens}>;
  // ... more methods
}

// Implementation
class AppwriteAuthAdapter implements IAuthService {
  // Appwrite-specific implementation
}
```

### 3. **Domain-Driven Design**
**Location**: `/src/core/domain/*`

Business entities with rich domain logic:

```typescript
export class User {
  static create(userData: Partial<User>): User {
    // Creation logic with validation
  }
  
  updateProfile(updates: ProfileUpdates): void {
    // Business rules for profile updates
  }
  
  changeRole(newRole: UserRole, companyId?: string): void {
    // Role change business logic
  }
}
```

### 4. **Permission-Based Authorization**
**Location**: `/src/core/services/PermissionService.ts` and `/src/utils/permissions.ts`

Granular permission system:

```typescript
export const PERMISSIONS = {
  PLATFORM: ['manage_platform', 'view_platform_analytics'],
  COMPANY: ['manage_company', 'view_company_analytics'],
  USER: ['manage_profile', 'create_journal', 'view_own_data']
} as const;

// Usage in controllers
await this.requirePermission(user, 'create_journal');
```

## 🔒 Security Architecture

### Authentication Flow
1. **Email/Password**: JWT tokens with refresh mechanism
2. **OAuth2**: Google authentication with Appwrite integration
3. **Session Management**: Token blacklisting and automatic refresh

### Authorization System
- **Role-Based Access Control (RBAC)**: 5 distinct user roles
- **Granular Permissions**: 11 specific permissions across platform, company, and user levels
- **Context-Aware Security**: Company-scoped data access

### Security Middleware
- **Authentication Middleware**: JWT validation and user context
- **Permission Guard**: Route-level permission checking
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Zod schema validation

## 📦 Service Architecture

### Service Registration
**Location**: `/src/core/providers/*`

Services are registered through providers:

```typescript
// AppwriteServiceProvider.ts
export function registerAppwriteServices(container: ServiceContainer) {
  container.register(SERVICE_KEYS.AUTH_SERVICE, () => new AppwriteAuthAdapter());
  container.register(SERVICE_KEYS.DATABASE_SERVICE, () => new AppwriteDatabaseAdapter());
  // ... more registrations
}
```

### Service Interfaces
**Location**: `/src/core/interfaces/*`

All external dependencies are abstracted through interfaces:

- `IAuthService` - Authentication operations
- `IDatabaseService` - Database operations  
- `IStorageService` - File storage operations
- `IEmailService` - Email notifications
- `IAIService` - AI integration
- `IPermissionService` - Permission management

## 🔄 Data Flow

### Request Processing Flow
1. **Route Handler**: Receives HTTP request with validation
2. **Middleware Chain**: Authentication → Permission check → Validation
3. **Controller**: Coordinates business logic through services
4. **Service Layer**: Implements business rules and calls adapters
5. **Adapter Layer**: Interacts with external services (Appwrite, etc.)
6. **Response**: Structured JSON response with error handling

### Data Transformation
- **Request**: HTTP → Validation Schema → Domain Objects
- **Business Logic**: Domain Objects → Service Operations
- **Persistence**: Domain Objects → Database Models → External API
- **Response**: Domain Objects → API Response → HTTP JSON

## 🧪 Testing Architecture

### Test Structure
- **Unit Tests**: Service logic and domain entities
- **Integration Tests**: Service adapters and external dependencies
- **API Tests**: End-to-end route testing

### Testing Tools
- **Test Runner**: Bun Test (built-in)
- **Mocking**: Manual mocks for external services
- **Fixtures**: Predefined test data

## 🚀 Performance Optimizations

### Efficiency Features
- **Bun Runtime**: Fast JavaScript execution
- **Connection Pooling**: Efficient database connections
- **JWT Caching**: Token validation optimization
- **Lazy Loading**: Services instantiated on demand

### Monitoring & Logging
- **Structured Logging**: Winston with JSON output
- **Request Tracking**: Unique request IDs
- **Performance Metrics**: Response time tracking
- **Error Aggregation**: Centralized error handling

## 🔧 Configuration Management

### Environment Configuration
**Location**: `/src/utils/config.ts`

Centralized configuration with environment validation:

```typescript
export const config = {
  app: {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  },
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT!,
    projectId: process.env.APPWRITE_PROJECT_ID!,
    apiKey: process.env.APPWRITE_API_KEY!,
  },
  // ... more configuration sections
};
```

### Required Environment Variables
- `APPWRITE_ENDPOINT` - Appwrite server URL
- `APPWRITE_PROJECT_ID` - Appwrite project identifier
- `APPWRITE_API_KEY` - Appwrite admin API key
- `JWT_SECRET` - JWT signing secret
- `GEMINI_API_KEY` - Google Gemini AI API key
- `FRONTEND_URL` - Frontend application URL

## 📈 Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: No server-side sessions
- **External State**: All state stored in Appwrite
- **Load Balancer Ready**: No sticky sessions required

### Vertical Scaling
- **Efficient Memory Usage**: Lazy service loading
- **Connection Pooling**: Database connection optimization
- **Caching Strategy**: JWT validation caching

### Future Scalability
- **Microservice Ready**: Clear service boundaries
- **Event-Driven Architecture**: Foundation for async operations
- **Database Sharding**: Appwrite scaling capabilities

---

This architecture provides a robust foundation for the MindSpace platform with clear separation of concerns, comprehensive security, and excellent maintainability while supporting both current needs and future growth.