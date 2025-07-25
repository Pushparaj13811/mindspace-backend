# MindSpace Backend - Folder Structure

## Overview

This document provides a comprehensive breakdown of the MindSpace backend codebase organization. The project follows **Clean Architecture** principles with clear separation of concerns across different layers.

## Root Directory Structure

```
mindspace-backend/
├── docs/                           # 📚 Documentation files
│   ├── architecture.md            # System architecture overview
│   ├── folder-structure.md         # This file - codebase organization
│   ├── permissions.md              # Permission system documentation
│   ├── services.md                 # Service layer documentation
│   ├── api-reference.md            # Complete API documentation
│   ├── config.md                   # Configuration and deployment
│   └── changelog.md                # Version history and updates
├── src/                            # 🚀 Main source code
├── package.json                    # 📦 Project dependencies and scripts
├── tsconfig.json                   # ⚙️ TypeScript configuration
├── .env.example                    # 🔧 Environment variables template
├── bun.lockb                       # 🔒 Bun package lock file
└── README.md                       # 📖 Project overview and setup
```

## Source Code Architecture (`src/`)

```
src/
├── index.ts                        # 🎯 Application entry point
├── bootstrap.ts                    # 🏗️ Service initialization and startup
├── controllers/                    # 🎮 Request handlers and API logic
├── core/                          # 🧠 Core business logic and architecture
├── models/                        # 📊 Data models and entity definitions  
├── routes/                        # 🛣️ API route definitions
├── scripts/                       # 🔧 Utility scripts and tools
├── services/                      # ⚙️ Business services and external adapters
├── types/                         # 📝 TypeScript type definitions
└── utils/                         # 🛠️ Shared utilities and helpers
```

## Detailed Directory Breakdown

### 1. Controllers Layer (`src/controllers/`)

**Purpose**: Handle HTTP requests, validate input, orchestrate business logic, and format responses.

```
controllers/
├── BaseController.ts               # 🏗️ Base controller with common functionality
├── AuthController.ts               # 🔐 Authentication and user management
├── JournalController.ts            # 📖 Journal entry management
├── MoodController.ts               # 😊 Mood tracking functionality
├── AIController.ts                 # 🤖 AI integration endpoints
└── CompanyController.ts            # 🏢 Company and organization management
```

**Key Features**:
- Request validation using Zod schemas
- Standardized error handling and logging
- Permission checking integration
- Structured response formatting
- Input sanitization and security

### 2. Core Layer (`src/core/`)

**Purpose**: Contains the heart of the application - business rules, domain logic, and architectural components.

```
core/
├── container/                      # 🏗️ Dependency Injection
│   └── ServiceContainer.ts         # DI container implementation
├── domain/                         # 🎯 Domain entities and business logic
│   ├── User.ts                     # User entity with business methods
│   └── Permission.ts               # Permission logic and role management
├── interfaces/                     # 📋 Service contracts and abstractions
│   ├── index.ts                    # Interface exports
│   ├── IAuthService.ts             # Authentication service contract
│   ├── IDatabaseService.ts         # Database operations contract
│   ├── IStorageService.ts          # File storage contract
│   ├── IPermissionService.ts       # Permission service contract
│   ├── IAIService.ts               # AI service contract
│   ├── IEmailService.ts            # Email service contract
│   ├── INotificationService.ts     # Notification service contract
│   └── ICompanyService.ts          # Company service contract
├── middleware/                     # ⚡ Request processing middleware
│   ├── AuthenticationMiddleware.ts # JWT token validation and user context
│   └── PermissionGuard.ts          # Authorization and permission checking
├── providers/                      # 🔌 Service provider registration
│   ├── AppwriteServiceProvider.ts  # Appwrite services registration
│   └── BusinessServiceProvider.ts  # Business logic services registration
└── services/                       # 🧠 Core business services
    └── PermissionService.ts         # Permission evaluation and management
```

#### Core Components Explained

##### Domain Entities (`core/domain/`)
- **User.ts**: Rich user entity with business methods (validation, profile updates, role changes)
- **Permission.ts**: Permission evaluation logic, role hierarchy, and access control rules

##### Interfaces (`core/interfaces/`)
- Define contracts for all services
- Enable dependency inversion and testability
- Support adapter pattern for external services

##### Dependency Injection (`core/container/`)
- Service registration and resolution
- Singleton and factory patterns
- Service health monitoring
- Provider-based organization

### 3. Models Layer (`src/models/`)

**Purpose**: Data models and entity definitions for business objects.

```
models/
├── index.ts                        # Model exports
├── BaseModel.ts                    # Base model with common functionality
├── UserModel.ts                    # User data model
├── CompanyModel.ts                 # Company/organization model
├── JournalModel.ts                 # Journal entry model
├── MoodModel.ts                    # Mood tracking model
└── NotificationModel.ts            # Notification model
```

**Features**:
- Data validation and serialization
- Database mapping utilities
- Common CRUD operations
- Type-safe data handling

### 4. Routes Layer (`src/routes/`)

**Purpose**: API endpoint definitions and request routing configuration.

```
routes/
├── auth.ts                         # 🔐 Authentication endpoints
│   # POST /login, /register, /logout, /refresh-token
│   # GET /profile, /resend-verification
│   # PUT /profile, /preferences, /change-password
│   # OAuth2 endpoints for Google integration
├── journal.ts                      # 📖 Journal management endpoints
│   # CRUD operations for journal entries
│   # GET /journals, POST /journals, PUT /journals/:id
├── mood.ts                         # 😊 Mood tracking endpoints
│   # Mood entry creation, analytics, trends
│   # GET /moods, POST /moods, GET /moods/analytics
├── ai.ts                           # 🤖 AI integration endpoints
│   # AI analysis, insights, recommendations
│   # POST /ai/analyze, /ai/insights, /ai/recommendations
└── company.ts                      # 🏢 Company management endpoints
    # Company CRUD, user management, analytics
    # GET /companies, POST /companies, PUT /companies/:id
```

**Route Features**:
- RESTful API design patterns
- OpenAPI/Swagger documentation
- Authentication and authorization middleware
- Input validation with Zod schemas
- Rate limiting and security measures

### 5. Services Layer (`src/services/`)

**Purpose**: Business logic implementation and external service integration through adapters.

```
services/
├── auth/                           # 🔐 Authentication services
│   └── AppwriteAuthAdapter.ts      # Appwrite authentication implementation
├── database/                       # 💾 Database services
│   └── AppwriteDatabaseAdapter.ts  # Appwrite database implementation
├── storage/                        # 📁 File storage services
│   └── AppwriteStorageAdapter.ts   # Appwrite storage implementation
├── CompanyService.ts               # 🏢 Company business logic
├── EmailService.ts                 # 📧 Email communication service
├── GeminiAIService.ts              # 🤖 Google Gemini AI integration
└── NotificationService.ts          # 🔔 Push notification service
```

#### Service Architecture

##### Adapter Pattern Implementation
Each external service (Appwrite, AI APIs, Email) is wrapped in an adapter that:
- Implements the service interface
- Handles external API communication
- Transforms data between internal and external formats
- Provides error handling and retry logic
- Enables service switching without code changes

##### Key Service Categories

**Core Infrastructure Services**:
- **AuthService**: User authentication, session management, OAuth2
- **DatabaseService**: Data persistence, queries, transactions
- **StorageService**: File uploads, downloads, management

**Business Logic Services**:
- **CompanyService**: Organization management, user relationships
- **EmailService**: Transactional emails, notifications
- **AIService**: Content analysis, recommendations, insights
- **NotificationService**: Push notifications, alerts

### 6. Scripts Layer (`src/scripts/`)

**Purpose**: Utility scripts for database setup, migrations, and maintenance tasks.

```
scripts/
└── setup-database.ts              # 🔧 Database initialization and collection setup
```

**Script Features**:
- Database schema creation
- Initial data seeding
- Collection and index setup
- Environment-specific configurations

### 7. Types Layer (`src/types/`)

**Purpose**: Centralized TypeScript type definitions for the entire application.

```
types/
└── index.ts                        # 📝 All type definitions and interfaces
```

**Type Categories**:
- **User Types**: User, UserRole, Permission, AuthTokens
- **Request/Response Types**: LoginRequest, RegisterRequest, API responses
- **Business Entity Types**: Journal, Mood, Company, Notification
- **Configuration Types**: Config, Database settings, AI configuration
- **OAuth2 Types**: OAuth2Session, OAuth2Request, OAuth2CallbackRequest

### 8. Utils Layer (`src/utils/`)

**Purpose**: Shared utilities, helpers, and common functionality.

```
utils/
├── __tests__/                      # 🧪 Unit tests for utilities
│   └── OAuth2ErrorHandler.test.ts # OAuth2 error handler tests
├── config.ts                       # ⚙️ Configuration management
├── jwt.ts                          # 🔒 JWT token utilities
├── jwtBlacklist.ts                 # 🚫 Token blacklist management
├── logger.ts                       # 📊 Structured logging with Winston
├── OAuth2ErrorHandler.ts           # 🔧 OAuth2 error handling
├── passwordResetStore.ts           # 🔑 Password reset token management
├── permissions.ts                  # 🛡️ Permission constants and helpers
├── response.ts                     # 📤 Standardized API response formats
├── validation.ts                   # ✅ Zod validation schemas
└── verificationStore.ts            # ✉️ Email verification token management
```

#### Key Utilities

##### Configuration Management (`config.ts`)
- Environment variable loading and validation
- Type-safe configuration object
- Environment-specific settings
- Required variable validation

##### JWT Management (`jwt.ts`, `jwtBlacklist.ts`)
- Token creation and verification
- Access and refresh token handling
- Token blacklisting for logout
- Security and expiration management

##### Validation (`validation.ts`)
- Zod schema definitions for all API endpoints
- Input validation and sanitization
- Type-safe request parsing
- Error message standardization

##### Logging (`logger.ts`)
- Structured logging with Winston
- Multiple log levels and formats
- File and console output
- Request context and correlation IDs

##### Response Formatting (`response.ts`)
- Standardized API response structure
- Success and error response helpers
- HTTP status code constants
- Consistent error messaging

## File Naming Conventions

### TypeScript Files
- **PascalCase** for classes and components: `AuthController.ts`, `UserService.ts`
- **camelCase** for utilities and functions: `config.ts`, `validation.ts`
- **Interface prefix**: `IAuthService.ts` for service interfaces

### Directory Organization
- **Pluralized names** for collections: `controllers/`, `services/`, `types/`
- **Descriptive grouping**: `auth/`, `database/`, `storage/` within services
- **Layer-based structure**: Clear separation by architectural layer

## Import/Export Patterns

### Barrel Exports
Key directories provide index files for clean imports:

```typescript
// types/index.ts - Central type exports
export type { User, UserRole, Permission } from './User';
export type { AuthTokens, LoginRequest } from './Auth';

// core/interfaces/index.ts - Service interface exports  
export type { IAuthService } from './IAuthService';
export type { IDatabaseService } from './IDatabaseService';
```

### Import Conventions
```typescript
// Relative imports for same layer
import { BaseController } from './BaseController.js';

// Absolute imports for cross-layer dependencies
import type { IAuthService } from '../core/interfaces/IAuthService.js';
import { logger } from '../utils/logger.js';

// External dependencies
import { Elysia } from 'elysia';
import { z } from 'zod';
```

## Build and Development Structure

### Development Files
- `package.json`: Dependencies, scripts, and project metadata
- `tsconfig.json`: TypeScript compiler configuration
- `bun.lockb`: Bun package manager lock file
- `.env.example`: Environment variable template

### Build Configuration
- **Runtime**: Bun (faster than Node.js)
- **Transpilation**: Built-in TypeScript support
- **Module System**: ES modules with `.js` extensions
- **Build Target**: Modern JavaScript for optimal performance

## Security Considerations in Structure

### Code Organization Security
- **Separation of Concerns**: Business logic isolated from external dependencies
- **Interface Abstraction**: No direct external service dependencies in business logic
- **Configuration Isolation**: All secrets and configuration in environment variables
- **Type Safety**: Comprehensive TypeScript coverage prevents runtime errors

### Access Control Organization
- **Permission Centralization**: All permission logic in core domain
- **Middleware Chain**: Consistent security checks across all endpoints
- **Audit Trail**: Structured logging for all security-relevant actions
- **Input Validation**: Centralized validation schemas prevent injection attacks

## Testing Structure (Planned)

```
src/
├── __tests__/                      # 🧪 Integration tests
├── controllers/__tests__/          # 🎮 Controller unit tests
├── core/__tests__/                 # 🧠 Core logic tests
├── services/__tests__/             # ⚙️ Service adapter tests
└── utils/__tests__/                # 🛠️ Utility function tests
    └── OAuth2ErrorHandler.test.ts  # Example utility test
```

## Documentation Structure

The `docs/` directory provides comprehensive documentation:
- **architecture.md**: System design and patterns
- **folder-structure.md**: This file - codebase navigation
- **permissions.md**: Authorization system details
- **services.md**: Service layer documentation
- **api-reference.md**: Complete API endpoint documentation
- **config.md**: Configuration and deployment guide

---

**Related Documentation**:
- [Architecture Overview](./architecture.md) - System design and patterns
- [Permission System](./permissions.md) - Authorization and access control
- [Service Layer](./services.md) - Business logic and external integrations
- [API Reference](./api-reference.md) - Complete endpoint documentation