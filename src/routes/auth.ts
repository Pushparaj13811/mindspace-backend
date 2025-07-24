import { Elysia, t } from 'elysia';
import { withServices } from '../container/ServiceContainer.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthController } from '../controllers/AuthController.js';

export const authRoutes = new Elysia({ prefix: '/auth' })
  
  // Register endpoint
  .post('/register', withServices(async (services, context) => {
    const controller = new AuthController(services);
    return await controller.register(context);
  }), {
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
    body: t.Object({
      email: t.String({ format: 'email' }),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Request password reset',
      description: 'Sends a password reset email to the user',
    },
  });