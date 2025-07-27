# MindSpace Backend Development Guide

## 🛠️ Development Workflow

This guide covers the development workflow, coding standards, and best practices for contributing to the MindSpace backend.

## 🏗️ Architecture Guidelines

### Clean Architecture Principles

Follow the established layer separation:

```
Presentation → Application → Domain → Infrastructure
```

#### 1. **Presentation Layer** (`/routes`, `/controllers`)
- Handle HTTP requests/responses
- Input validation using Zod schemas
- Route-level middleware
- OpenAPI documentation

```typescript
// Example: Route definition with validation
.post('/journal', withServices(async (services, context) => {
  const user = await authMiddleware().requireAuthWithPermission(context, 'create_journal');
  context.user = user;
  
  const controller = new JournalController(services);
  return await controller.createEntry(context);
}), {
  body: t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    content: t.String({ minLength: 10, maxLength: 10000 }),
    // ... validation schema
  })
})
```

#### 2. **Application Layer** (`/core/services`, `/services`)
- Business logic coordination
- Service orchestration
- Cross-cutting concerns

```typescript
// Example: Service implementation
export class JournalService {
  constructor(
    private databaseService: IDatabaseService,
    private aiService: IAIService
  ) {}
  
  async createEntry(userId: string, entryData: CreateJournalData): Promise<JournalEntry> {
    // Business logic here
    const entry = await this.databaseService.createJournalEntry(userId, entryData);
    
    // AI analysis (optional)
    if (entryData.enableAI) {
      const insights = await this.aiService.analyzeJournalEntry(entry);
      entry.aiInsights = insights;
    }
    
    return entry;
  }
}
```

#### 3. **Domain Layer** (`/core/domain`)
- Business entities and rules
- Domain-specific validation
- Rich domain models

```typescript
// Example: Domain entity
export class User {
  static create(userData: Partial<User>): User {
    // Domain validation
    if (!userData.email || !isValidEmail(userData.email)) {
      throw new Error('Valid email is required');
    }
    
    return new User({
      ...userData,
      role: userData.role || 'INDIVIDUAL_USER',
      permissions: PermissionDomain.getRolePermissions(userData.role || 'INDIVIDUAL_USER'),
      isActive: true,
      createdAt: new Date().toISOString()
    });
  }
  
  updateProfile(updates: ProfileUpdates): void {
    // Business rules for profile updates
    if (updates.name && updates.name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    
    this.name = updates.name || this.name;
    this.avatar = updates.avatar || this.avatar;
    this.updatedAt = new Date().toISOString();
  }
}
```

#### 4. **Infrastructure Layer** (`/services`, `/models`)
- External service adapters
- Database operations
- Third-party integrations

```typescript
// Example: Service adapter
export class AppwriteJournalAdapter implements IJournalService {
  async createEntry(userId: string, entryData: CreateJournalData): Promise<JournalEntry> {
    try {
      const doc = await this.database.createDocument(
        DATABASE_ID,
        JOURNAL_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          ...entryData,
          createdAt: new Date().toISOString()
        }
      );
      
      return this.mapDocumentToJournalEntry(doc);
    } catch (error) {
      throw new DatabaseError('Failed to create journal entry', error);
    }
  }
}
```

### Dependency Injection

Use the service container for all dependencies:

```typescript
// Service registration
container.register(SERVICE_KEYS.JOURNAL_SERVICE, () => 
  new JournalService(
    getService(SERVICE_KEYS.DATABASE_SERVICE),
    getService(SERVICE_KEYS.AI_SERVICE)
  )
);

// Service usage in controllers
export class JournalController extends BaseController {
  async createEntry(context: any) {
    const journalService = this.services.journalService;
    // Use service...
  }
}
```

## 📝 Coding Standards

### TypeScript Guidelines

#### 1. **Strict Mode**
Always use TypeScript strict mode:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### 2. **Type Definitions**
Define proper interfaces for all data structures:

```typescript
// Good: Proper interface
interface CreateJournalRequest {
  title: string;
  content: string;
  mood: MoodState;
  tags?: string[];
  attachments?: JournalAttachments;
}

// Bad: Using any
function createJournal(data: any): any {
  // Don't do this
}
```

#### 3. **Error Handling**
Use typed error handling:

```typescript
// Good: Typed error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error: unknown) {
  if (error instanceof AppwriteException) {
    throw new DatabaseError(error.message);
  }
  throw new Error('Unknown error occurred');
}

// Bad: Untyped errors
try {
  const result = await riskyOperation();
} catch (error: any) {
  throw error; // Don't do this
}
```

### Validation with Zod

#### 1. **Schema Definition**
Create reusable schemas:

```typescript
// schemas/journal.ts
export const createJournalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10,000 characters'),
  mood: moodStateSchema,
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;
```

#### 2. **Validation Usage**
Use schemas consistently:

```typescript
// In controllers
const validatedData = this.validateRequestBody(createJournalSchema, body);

// In services (additional validation)
export class JournalService {
  async createEntry(data: CreateJournalInput): Promise<JournalEntry> {
    // Additional business validation
    if (data.content.includes('forbidden_word')) {
      throw new ValidationError('Content contains prohibited terms');
    }
    
    // Process...
  }
}
```

### Error Handling

#### 1. **Business Errors**
Use specific error types:

```typescript
// utils/BusinessError.ts
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends Error {
  constructor(message: string, public requiredPermission: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
```

#### 2. **Error Mapping**
Map external errors to business errors:

```typescript
private mapAppwriteErrorToBusinessError(error: AppwriteException): Error {
  switch (error.code) {
    case 401:
      return new AuthenticationError('Invalid credentials');
    case 409:
      return new ConflictError('Resource already exists');
    case 429:
      return new RateLimitError('Too many requests');
    default:
      return new Error(error.message);
  }
}
```

### Logging Standards

#### 1. **Structured Logging**
Use structured logging with context:

```typescript
// Good: Structured logging
logger.info('User login attempt', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.userAgent
});

logger.error('Database operation failed', {
  operation: 'createJournalEntry',
  userId: user.id,
  error: error.message,
  stack: error.stack
});
```

#### 2. **Log Levels**
Use appropriate log levels:

```typescript
logger.debug('Detailed debugging info'); // Development only
logger.info('General information');       // Normal operations
logger.warn('Warning conditions');        // Potential issues
logger.error('Error conditions');         // Errors that need attention
```

## 🧪 Testing Guidelines

### Test Structure

Organize tests by feature:

```
__tests__/
├── unit/
│   ├── services/
│   │   ├── AuthService.test.ts
│   │   └── JournalService.test.ts
│   ├── domain/
│   │   ├── User.test.ts
│   │   └── Permission.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── jwt.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   └── journal.test.ts
│   └── services/
│       └── AppwriteAdapter.test.ts
└── e2e/
    ├── auth-flow.test.ts
    └── journal-flow.test.ts
```

### Unit Testing

#### 1. **Service Testing**
Mock external dependencies:

```typescript
// __tests__/unit/services/JournalService.test.ts
describe('JournalService', () => {
  let journalService: JournalService;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;
  let mockAIService: jest.Mocked<IAIService>;

  beforeEach(() => {
    mockDatabaseService = {
      createJournalEntry: jest.fn(),
      getJournalEntry: jest.fn(),
      // ... other methods
    } as any;

    mockAIService = {
      analyzeJournalEntry: jest.fn(),
      // ... other methods
    } as any;

    journalService = new JournalService(mockDatabaseService, mockAIService);
  });

  describe('createEntry', () => {
    it('should create journal entry successfully', async () => {
      // Arrange
      const entryData = {
        title: 'Test Entry',
        content: 'Test content',
        mood: { current: 'happy', intensity: 8 }
      };
      
      const expectedEntry = { id: '123', ...entryData };
      mockDatabaseService.createJournalEntry.mockResolvedValue(expectedEntry);

      // Act
      const result = await journalService.createEntry('user123', entryData);

      // Assert
      expect(result).toEqual(expectedEntry);
      expect(mockDatabaseService.createJournalEntry).toHaveBeenCalledWith('user123', entryData);
    });
  });
});
```

#### 2. **Domain Testing**
Test business logic:

```typescript
// __tests__/unit/domain/User.test.ts
describe('User Domain', () => {
  describe('create', () => {
    it('should create user with default values', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePass123'
      };

      const user = User.create(userData);

      expect(user.role).toBe('INDIVIDUAL_USER');
      expect(user.isActive).toBe(true);
      expect(user.permissions).toContain('manage_profile');
    });

    it('should throw error for invalid email', () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'SecurePass123'
      };

      expect(() => User.create(userData)).toThrow('Valid email is required');
    });
  });
});
```

### Integration Testing

Test API endpoints:

```typescript
// __tests__/integration/api/auth.test.ts
describe('Auth API', () => {
  let app: Elysia;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePass123'
      };

      const response = await app
        .handle(new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        }));

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(userData.email);
      expect(data.data.session.accessToken).toBeDefined();
    });
  });
});
```

## 🔄 Development Workflow

### 1. **Feature Development**

#### Branch Naming
```bash
# Feature branches
feature/user-authentication
feature/journal-ai-analysis
feature/company-management

# Bug fixes
bugfix/signup-phone-number
bugfix/oauth-callback-error

# Hotfixes
hotfix/security-vulnerability
```

#### Development Process
1. **Create feature branch** from main
2. **Implement feature** following architecture guidelines
3. **Write tests** for new functionality
4. **Update documentation** if needed
5. **Run quality checks** (lint, type-check, tests)
6. **Create pull request** with detailed description

### 2. **Code Quality Checks**

Run before committing:

```bash
# Type checking
bun run type-check

# Linting (when available)
bun run lint

# Tests
bun test

# Build verification
bun run build
```

### 3. **Commit Guidelines**

Use conventional commits:

```bash
# Feature commits
git commit -m "feat: add journal entry AI analysis"
git commit -m "feat(auth): implement OAuth2 Google login"

# Bug fixes
git commit -m "fix: resolve phoneNumber undefined in registration"
git commit -m "fix(api): correct journal pagination logic"

# Documentation
git commit -m "docs: update API documentation for mood endpoints"

# Refactoring
git commit -m "refactor: improve error handling in auth service"

# Tests
git commit -m "test: add unit tests for permission service"
```

### 4. **Pull Request Process**

#### PR Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
- [ ] Type checking passes
```

## 🛡️ Security Guidelines

### 1. **Authentication**
- Always validate JWT tokens
- Use refresh token rotation
- Implement proper logout (token blacklisting)

### 2. **Authorization**
- Check permissions at the route level
- Validate user context for data access
- Use least privilege principle

### 3. **Input Validation**
- Validate all inputs with Zod schemas
- Sanitize user content
- Check file upload restrictions

### 4. **Data Protection**
- Never log sensitive data (passwords, tokens)
- Use secure headers for responses
- Implement rate limiting

## 📊 Performance Guidelines

### 1. **Database Optimization**
- Use proper indexes for query performance
- Implement pagination for large datasets
- Avoid N+1 query problems

### 2. **Caching Strategy**
- Cache JWT validation results
- Use in-memory caching for frequently accessed data
- Implement cache invalidation strategies

### 3. **Resource Management**
- Use connection pooling for database
- Implement proper cleanup in services
- Monitor memory usage

## 🐛 Debugging

### 1. **Development Debugging**
```bash
# Enable debug mode
LOG_LEVEL=debug bun run dev

# Watch logs in real-time
tail -f logs/app.log
tail -f logs/app-error.log
```

### 2. **Debugging Tools**
```typescript
// Use debug logging
logger.debug('Processing journal entry', {
  userId: user.id,
  entryId: entry.id,
  timestamp: Date.now()
});

// Add performance timing
const startTime = Date.now();
const result = await expensiveOperation();
logger.info('Operation completed', {
  operation: 'expensiveOperation',
  duration: Date.now() - startTime
});
```

### 3. **Common Debug Scenarios**
- **Authentication Issues**: Check JWT token validity and user permissions
- **Database Errors**: Verify collection structure and indexes
- **API Validation**: Check Zod schema definitions
- **Performance Issues**: Add timing logs and check database queries

## 📖 Documentation Standards

### 1. **Code Documentation**
```typescript
/**
 * Creates a new journal entry for the specified user
 * 
 * @param userId - The unique identifier of the user
 * @param entryData - The journal entry data to create
 * @returns Promise that resolves to the created journal entry
 * @throws {ValidationError} When entry data is invalid
 * @throws {PermissionError} When user lacks required permissions
 * @throws {DatabaseError} When database operation fails
 */
async createEntry(userId: string, entryData: CreateJournalData): Promise<JournalEntry> {
  // Implementation...
}
```

### 2. **API Documentation**
Use OpenAPI/Swagger annotations:

```typescript
.post('/journal', withServices(async (services, context) => {
  // Handler implementation
}), {
  body: t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    content: t.String({ minLength: 10, maxLength: 10000 }),
  }),
  detail: {
    tags: ['Journal'],
    summary: 'Create journal entry',
    description: 'Creates a new journal entry for the authenticated user',
    security: [{ bearerAuth: [] }],
  },
})
```

### 3. **Documentation Updates**
When adding features:
1. Update API documentation in routes
2. Update feature status in `FEATURES.md`
3. Add examples to relevant guides
4. Update architecture docs if needed

---

Following these guidelines ensures consistency, maintainability, and quality across the MindSpace backend codebase.