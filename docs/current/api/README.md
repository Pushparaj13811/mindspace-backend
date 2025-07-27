# MindSpace Backend API Reference

## 🌐 API Overview

The MindSpace backend provides a comprehensive REST API for mental wellness applications, built with Elysia.js and featuring automatic OpenAPI documentation.

### Base URLs
- **Development**: `http://localhost:3000/api/v1`
- **API Documentation**: `http://localhost:3000/swagger`
- **Health Check**: `http://localhost:3000/health`

### Response Format
All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "message": "Optional additional context",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Authentication
Protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## 🔐 Authentication Endpoints

### POST /api/v1/auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phoneNumber": "+1234567890" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "$id": "user_64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false,
      "role": "INDIVIDUAL_USER",
      "permissions": ["manage_profile", "create_journal", "view_own_data"],
      "subscription": { "tier": "free" },
      "preferences": {
        "theme": "auto",
        "notifications": true,
        "preferredAIModel": "gpt-4",
        "language": "en"
      },
      "isActive": true,
      "createdAt": "2025-01-27T10:30:00.000Z",
      "updatedAt": "2025-01-27T10:30:00.000Z"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  },
  "message": "Registration successful"
}
```

**Validation Rules:**
- Email: Valid email format required
- Password: Minimum 8 characters, must contain uppercase, lowercase, and number
- Name: 2-100 characters
- Phone Number: Optional, international format (+1234567890)

### POST /api/v1/auth/login
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):** Same as registration response

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "session": {
      "accessToken": "new_jwt_token",
      "refreshToken": "new_refresh_token",
      "expiresIn": 3600
    }
  }
}
```

### POST /api/v1/auth/logout
**Headers:** `Authorization: Bearer <token>`

Invalidate current session and logout user.

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Successfully logged out" }
}
```

### GET /api/v1/auth/me
**Headers:** `Authorization: Bearer <token>`

Get current user profile information.

**Response (200):**
```json
{
  "success": true,
  "data": { "user": { /* User object */ } }
}
```

### PUT /api/v1/auth/profile
**Headers:** `Authorization: Bearer <token>`

Update user profile information.

**Request Body:**
```json
{
  "name": "New Name",
  "avatar": "https://example.com/avatar.jpg"
}
```

### PUT /api/v1/auth/preferences
**Headers:** `Authorization: Bearer <token>`

Update user preferences.

**Request Body:**
```json
{
  "theme": "dark",
  "notifications": false,
  "preferredAIModel": "claude-3",
  "language": "es"
}
```

### PUT /api/v1/auth/password
**Headers:** `Authorization: Bearer <token>`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### POST /api/v1/auth/reset-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/v1/auth/confirm-password-reset
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewPassword123"
}
```

### POST /api/v1/auth/resend-verification
**Headers:** `Authorization: Bearer <token>`

Resend email verification link.

### GET /api/v1/auth/verify-email
Verify email address using verification token.

**Query Parameters:**
- `token`: Verification token from email

## 🔑 OAuth2 Authentication

### POST /api/v1/auth/oauth2/initiate
Initiate OAuth2 authentication flow with Google.

**Request Body:**
```json
{
  "provider": "google",
  "successUrl": "https://myapp.com/auth/success",
  "failureUrl": "https://myapp.com/auth/error"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "redirectUrl": "https://accounts.google.com/oauth/authorize?..."
  },
  "message": "OAuth2 session created successfully"
}
```

### GET /api/v1/auth/oauth2/callback
Handle OAuth2 callback from Google.

**Query Parameters:**
- `userId`: User ID from OAuth provider
- `secret`: Secret token from OAuth provider

**Response (200):** Same as login response with complete user object and session tokens

## 📝 Journal Endpoints

### POST /api/v1/journal
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `create_journal`

Create a new journal entry.

**Request Body:**
```json
{
  "title": "My Day Reflection",
  "content": "Today was a good day with mixed emotions...",
  "mood": {
    "current": "happy",
    "intensity": 7,
    "timestamp": "2025-01-27T10:30:00.000Z",
    "triggers": ["work", "family"],
    "notes": "Felt energetic after morning workout"
  },
  "tags": ["personal", "reflection"],
  "attachments": {
    "images": ["image_url_1", "image_url_2"],
    "voiceRecording": "audio_url"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "$id": "entry_64f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "user_64f1a2b3c4d5e6f7g8h9i0j1",
      "title": "My Day Reflection",
      "content": "Today was a good day...",
      "mood": { /* mood object */ },
      "tags": ["personal", "reflection"],
      "attachments": { /* attachments */ },
      "encrypted": false,
      "aiInsights": {
        "sentiment": 0.7,
        "emotions": ["happiness", "contentment"],
        "themes": ["gratitude", "personal growth"],
        "suggestions": ["Continue morning workouts"]
      },
      "createdAt": "2025-01-27T10:30:00.000Z",
      "updatedAt": "2025-01-27T10:30:00.000Z"
    }
  }
}
```

### GET /api/v1/journal
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data`

Get journal entries with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, updatedAt, title)
- `sortOrder`: Sort direction (asc, desc)
- `search`: Search in title and content
- `tags`: Comma-separated tags filter
- `dateFrom`: Start date filter (ISO string)
- `dateTo`: End date filter (ISO string)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entries": [/* array of journal entries */],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /api/v1/journal/search
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data`

Search journal entries by title and content.

**Query Parameters:**
- `search`: Search query (required, 1-100 chars)
- `page`: Page number
- `limit`: Items per page
- `sortBy`: Sort field
- `sortOrder`: Sort direction

### GET /api/v1/journal/:id
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data`

Get specific journal entry by ID.

### PUT /api/v1/journal/:id
**Headers:** `Authorization: Bearer <token>`

Update journal entry (user can only update their own entries).

### DELETE /api/v1/journal/:id
**Headers:** `Authorization: Bearer <token>`

Delete journal entry (user can only delete their own entries).

### GET /api/v1/journal/analytics
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data` or `view_company_data`

Get journal analytics data.

**Query Parameters:**
- `dateFrom`: Start date (optional)
- `dateTo`: End date (optional)
- `companyId`: Company ID (super admin only)

## 😊 Mood Endpoints

### POST /api/v1/mood
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `create_journal`

Log a new mood entry.

**Request Body:**
```json
{
  "current": "happy",
  "intensity": 8,
  "timestamp": "2025-01-27T10:30:00.000Z",
  "triggers": ["exercise", "social"],
  "notes": "Great workout session this morning",
  "location": "Home",
  "weather": "Sunny",
  "activities": ["exercise", "meditation"],
  "sleepQuality": 8,
  "stressLevel": 2,
  "energyLevel": 9,
  "socialInteraction": "positive"
}
```

**Mood Values:**
- `current`: happy, sad, anxious, calm, energetic, depressed, excited, angry, peaceful, stressed
- `intensity`: 1-10 scale
- All other fields are optional

### GET /api/v1/mood
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data`

Get mood entries with filtering and pagination.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder`: Pagination
- `dateFrom`, `dateTo`: Date range filtering
- `mood`: Filter by specific mood
- `minIntensity`, `maxIntensity`: Intensity range
- `period`: Predefined periods (7d, 30d, 90d, 1y)

### GET /api/v1/mood/:id
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data`

Get specific mood entry by ID.

### PUT /api/v1/mood/:id
**Headers:** `Authorization: Bearer <token>`

Update mood entry.

### DELETE /api/v1/mood/:id
**Headers:** `Authorization: Bearer <token>`

Delete mood entry.

### GET /api/v1/mood/analytics
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data` or `view_company_data`

Get mood analytics and insights.

### GET /api/v1/mood/trends
**Headers:** `Authorization: Bearer <token>`
**Permission Required:** `view_own_data` or `view_company_data`

Get mood trends over time.

## 🤖 AI Endpoints

### POST /api/v1/ai/chat
**Headers:** `Authorization: Bearer <token>`

Chat with AI assistant.

**Request Body:**
```json
{
  "message": "How can I improve my mood today?",
  "includeContext": true
}
```

### POST /api/v1/ai/analyze
**Headers:** `Authorization: Bearer <token>`

Analyze journal or mood data using AI.

**Request Body:**
```json
{
  "entryId": "journal_entry_id"
}
```

### GET /api/v1/ai/insights
**Headers:** `Authorization: Bearer <token>`

Get AI-generated insights.

**Query Parameters:**
- `period`: Time period (7d, 30d, 90d, 1y)
- `includeRecommendations`: Include AI recommendations (boolean)

### GET /api/v1/ai/suggestions
**Headers:** `Authorization: Bearer <token>`

Get AI suggestions for mood improvement.

### GET /api/v1/ai/affirmations
**Headers:** `Authorization: Bearer <token>`

Get personalized affirmations.

## 🏢 Company Endpoints
**Note:** These endpoints are for enterprise features and require appropriate company roles.

### POST /api/v1/company/register
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `SUPER_ADMIN`

Register a new company.

### GET /api/v1/company/info
**Headers:** `Authorization: Bearer <token>`
**Role Required:** Company roles

Get company information.

### PUT /api/v1/company/update
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN`

Update company information.

### GET /api/v1/company/dashboard
**Headers:** `Authorization: Bearer <token>`
**Role Required:** Company roles

Get company dashboard data.

### GET /api/v1/company/users
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN` or `COMPANY_MANAGER`

Get company users.

### POST /api/v1/company/users
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN`

Add user to company.

### PUT /api/v1/company/users/:userId
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN`

Update company user.

### DELETE /api/v1/company/users/:userId
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN`

Remove user from company.

### GET /api/v1/company/analytics
**Headers:** `Authorization: Bearer <token>`
**Role Required:** `COMPANY_ADMIN` or `COMPANY_MANAGER`

Get company analytics.

## 🔐 Permissions System

### User Roles
- **SUPER_ADMIN**: Platform management, all permissions
- **COMPANY_ADMIN**: Company management, user administration
- **COMPANY_MANAGER**: Department management, analytics
- **COMPANY_USER**: Basic company features
- **INDIVIDUAL_USER**: Personal data only

### Permissions
- **Platform**: `manage_platform`, `view_platform_analytics`, `manage_companies`
- **Company**: `manage_company`, `view_company_analytics`, `manage_company_users`
- **User**: `manage_profile`, `create_journal`, `view_own_data`, `delete_account`

## 🏥 System Endpoints

### GET /health
Check API health status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "version": "1.0.0",
    "services": {
      "total": 5,
      "healthy": 5,
      "unhealthy": 0,
      "details": {
        "database": "healthy",
        "storage": "healthy",
        "auth": "healthy",
        "ai": "healthy",
        "email": "healthy"
      }
    }
  }
}
```

### GET /api/v1
Get API information and available endpoints.

## 📝 Error Codes

### Authentication Errors
- `INVALID_CREDENTIALS`: Email or password incorrect
- `ACCOUNT_LOCKED`: Account temporarily locked
- `EMAIL_NOT_VERIFIED`: Email verification required
- `INVALID_REFRESH_TOKEN`: Refresh token invalid or expired

### Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `EMAIL_EXISTS`: Account with email already exists

### Permission Errors
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `ROLE_REQUIRED`: Specific role required for access

### Generic Errors
- `NOT_FOUND`: Resource not found
- `INTERNAL_SERVER_ERROR`: Server error occurred

## 🚀 Rate Limiting

Authentication endpoints are rate-limited to prevent abuse:
- **Registration**: 5 requests per hour per IP
- **Login**: 10 requests per minute per IP
- **Password Reset**: 3 requests per hour per email
- **OAuth**: 10 requests per minute per IP

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Security event tracking

---

For interactive API exploration, visit the Swagger documentation at `/swagger` when the server is running.