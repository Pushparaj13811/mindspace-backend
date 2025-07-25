import { Elysia, t } from 'elysia';
import { withServices } from '../container/ServiceContainer.js';
import { authMiddleware, rateLimitMiddleware } from '../middleware/auth.js';
import { AuthController } from '../controllers/AuthController.js';

export const authRoutes = new Elysia()

  // Register endpoint
  .post('/register', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.register(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
      name: t.String({ minLength: 2, maxLength: 100 }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Creates a new user account with email and password',
    },
  })

  // Login endpoint
  .post('/login', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.login(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticates user with email and password',
    },
  })

  // Refresh token endpoint
  .post('/refresh', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.refreshToken(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      refreshToken: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Generates a new access token using the refresh token',
    },
  })

  // Logout endpoint
  .post('/logout', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.logout(context);
  }), {
    beforeHandle: authMiddleware,
    detail: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Invalidates the current session',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get current user profile
  .get('/me', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.getCurrentUser(context);
  }), {
    beforeHandle: authMiddleware,
    detail: {
      tags: ['Auth'],
      summary: 'Get current user profile',
      description: 'Returns the authenticated user\'s profile information',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update user profile
  .put('/profile', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.updateProfile(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
      avatar: t.Optional(t.String({ format: 'uri' })),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Update user profile',
      description: 'Updates the authenticated user\'s profile information',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update user preferences
  .put('/preferences', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.updatePreferences(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      theme: t.Optional(t.Union([t.Literal('light'), t.Literal('dark'), t.Literal('auto')])),
      notifications: t.Optional(t.Boolean()),
      preferredAIModel: t.Optional(t.String({ maxLength: 50 })),
      language: t.Optional(t.String({ maxLength: 10 })),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Update user preferences',
      description: 'Updates the authenticated user\'s preferences',
      security: [{ bearerAuth: [] }],
    },
  })

  // Change password endpoint
  .put('/password', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.changePassword(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      currentPassword: t.String({ minLength: 1 }),
      newPassword: t.String({ minLength: 8 }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Change user password',
      description: 'Changes the authenticated user\'s password',
      security: [{ bearerAuth: [] }],
    },
  })

  // Request password reset
  .post('/reset-password', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.requestPasswordReset(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      email: t.String({ format: 'email' }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Request password reset',
      description: 'Sends a password reset email to the user',
    },
  })

  // Confirm password reset
  .post('/confirm-password-reset', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.confirmPasswordReset(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      token: t.String({ minLength: 1, description: 'Reset token from the password reset email' }),
      password: t.String({ minLength: 8, description: 'New password for the account' }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Confirm password reset',
      description: 'Resets user password using the token from the reset email',
    },
  })

  // Resend email verification
  .post('/resend-verification', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.resendVerification(context);
  }), {
    beforeHandle: authMiddleware,
    detail: {
      tags: ['Auth'],
      summary: 'Resend email verification',
      description: 'Sends a new email verification link to the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  })

  // Confirm email verification
  .get('/verify-email', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.confirmVerification(context);
  }), {
    query: t.Object({
      token: t.String({
        description: 'Verification token from the verification email'
      }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Verify email address',
      description: 'Confirms email verification using the custom token sent to user\'s email',
    },
  })

  // OAuth2 initiation endpoint
  .post('/oauth2/initiate', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.initiateOAuth2(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    body: t.Object({
      provider: t.Literal('google', {
        description: 'OAuth2 provider - currently only Google is supported'
      }),
      successUrl: t.Optional(t.String({
        format: 'uri',
        description: 'URL to redirect to after successful authentication. If not provided, defaults to frontend success page.'
      })),
      failureUrl: t.Optional(t.String({
        format: 'uri',
        description: 'URL to redirect to after failed authentication. If not provided, defaults to frontend error page.'
      })),
    }),

    detail: {
      tags: ['Auth'],
      summary: 'Initiate OAuth2 authentication',
      description: `
        Initiates the OAuth2 authentication flow with Google. This endpoint creates an OAuth2 session 
        and returns a redirect URL that the client should navigate to for user authentication.
        
        **OAuth2 Flow:**
        1. Client calls this endpoint with provider and optional redirect URLs
        2. Server creates OAuth2 session with Appwrite
        3. Server returns redirect URL for Google OAuth2
        4. Client redirects user to the returned URL
        5. User authenticates with Google
        6. Google redirects back to the callback endpoint with authorization code
        7. Callback endpoint processes the code and creates user session
        
        **Rate Limiting:** This endpoint is rate-limited to prevent abuse.
        
        **Example Request:**
        \`\`\`json
        {
          "provider": "google",
          "successUrl": "https://myapp.com/auth/success",
          "failureUrl": "https://myapp.com/auth/error"
        }
        \`\`\`
        
        **Example Response:**
        \`\`\`json
        {
          "success": true,
          "data": {
            "redirectUrl": "https://accounts.google.com/oauth/authorize?..."
          },
          "message": "OAuth2 session created successfully",
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
        \`\`\`
      `,
    },
  })

  // OAuth2 callback endpoint
  .get('/oauth2/callback', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.handleOAuth2Callback(context);
  }), {
    beforeHandle: rateLimitMiddleware,
    query: t.Object({
      userId: t.String({
        description: 'User ID returned by OAuth2 provider after successful authentication'
      }),
      secret: t.String({
        description: 'Secret token returned by OAuth2 provider for session validation'
      }),
    }),

    detail: {
      tags: ['Auth'],
      summary: 'Handle OAuth2 callback',
      description: `
        Processes the OAuth2 callback from Google and creates a user session. This endpoint is called 
        automatically by the OAuth2 provider after user authentication.
        
        **OAuth2 Callback Flow:**
        1. User completes authentication with Google
        2. Google redirects to this endpoint with userId and secret parameters
        3. Server validates the OAuth2 session using Appwrite
        4. Server creates or retrieves user account
        5. Server returns user data and session tokens
        
        **Authentication:** This endpoint processes OAuth2 authentication and returns session tokens.
        
        **Rate Limiting:** This endpoint is rate-limited to prevent abuse.
        
        **Error Scenarios:**
        - **400 Bad Request:** Missing or invalid callback parameters
        - **401 Unauthorized:** OAuth2 session expired or invalid
        - **500 Internal Server Error:** OAuth2 provider configuration issues
        
        **Example Callback URL:**
        \`\`\`
        GET /api/v1/auth/oauth2/callback?userId=64f1a2b3c4d5e6f7g8h9i0j1&secret=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        \`\`\`
        
        **Example Response:**
        \`\`\`json
        {
          "success": true,
          "data": {
            "user": {
              "$id": "64f1a2b3c4d5e6f7g8h9i0j1",
              "email": "user@example.com",
              "name": "John Doe",
              "avatar": "https://lh3.googleusercontent.com/...",
              "subscription": {
                "tier": "free"
              },
              "preferences": {
                "theme": "auto",
                "notifications": true,
                "preferredAIModel": "gpt-4",
                "language": "en"
              },
              "createdAt": "2024-01-15T10:30:00.000Z",
              "updatedAt": "2024-01-15T10:30:00.000Z"
            },
            "session": {
              "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              "expiresIn": 3600
            }
          },
          "message": "OAuth2 authentication successful",
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
        \`\`\`
        
        **Integration Notes:**
        - The returned user object follows the same structure as email/password authentication
        - Session tokens can be used with existing authentication middleware
        - OAuth2 users can use all existing user management endpoints
        - The access token should be included in subsequent API requests as: \`Authorization: Bearer <accessToken>\`
      `,
    },
  });