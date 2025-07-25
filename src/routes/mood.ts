import { Elysia, t } from 'elysia';
import { withServices, getService, SERVICE_KEYS } from '../core/container/ServiceContainer.js';
import { AuthenticationMiddleware } from '../core/middleware/AuthenticationMiddleware.js';
import { MoodController } from '../controllers/MoodController.js';

// Get authentication middleware from container
const authMiddleware = () => getService<AuthenticationMiddleware>(SERVICE_KEYS.AUTH_MIDDLEWARE);

export const moodRoutes = new Elysia({ prefix: '/mood' })
  
  // Log a new mood entry
  .post('/', withServices(async (services, context) => {
    // Require authentication and 'create_journal' permission (mood entries are related to journaling)
    const user = await authMiddleware().requireAuthWithPermission(context, 'create_journal');
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.logMood(context);
  }), {
    body: t.Object({
      current: t.Union([
        t.Literal('happy'),
        t.Literal('sad'),
        t.Literal('anxious'),
        t.Literal('calm'),
        t.Literal('energetic'),
        t.Literal('depressed'),
        t.Literal('excited'),
        t.Literal('angry'),
        t.Literal('peaceful'),
        t.Literal('stressed')
      ]),
      intensity: t.Number({ minimum: 1, maximum: 10 }),
      timestamp: t.String(),
      triggers: t.Optional(t.Array(t.String({ maxLength: 100 }), { maxItems: 10 })),
      notes: t.Optional(t.String({ maxLength: 500 })),
      context: t.Optional(t.Object({
        location: t.Optional(t.String({ maxLength: 100 })),
        activity: t.Optional(t.String({ maxLength: 100 })),
        weather: t.Optional(t.String({ maxLength: 50 })),
        socialSituation: t.Optional(t.String({ maxLength: 100 })),
      })),
    }),
    detail: {
      tags: ['Mood'],
      summary: 'Log mood entry',
      description: 'Logs a new mood entry for the authenticated user. Requires create_journal permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get mood history with pagination
  .get('/', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'view_own_data');
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.getMoodHistory(context);
  }), {
    query: t.Optional(t.Object({
      page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
      sortBy: t.Optional(t.Union([
        t.Literal('timestamp'),
        t.Literal('intensity'),
        t.Literal('current')
      ], { default: 'timestamp' })),
      sortOrder: t.Optional(t.Union([
        t.Literal('asc'), 
        t.Literal('desc')
      ], { default: 'desc' })),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      mood: t.Optional(t.String()), // Filter by specific mood
      minIntensity: t.Optional(t.Numeric({ minimum: 1, maximum: 10 })),
      maxIntensity: t.Optional(t.Numeric({ minimum: 1, maximum: 10 })),
    })),
    detail: {
      tags: ['Mood'],
      summary: 'Get mood history',
      description: 'Retrieves mood history for the authenticated user with pagination and filtering. Requires view_own_data permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get mood insights and trends
  .get('/insights', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'view_own_data');
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.getMoodInsights(context);
  }), {
    query: t.Optional(t.Object({
      period: t.Optional(t.Union([
        t.Literal('7d'),
        t.Literal('30d'),
        t.Literal('90d'),
        t.Literal('1y')
      ], { default: '30d' })),
      includeRecommendations: t.Optional(t.Boolean({ default: true })),
    })),
    detail: {
      tags: ['Mood'],
      summary: 'Get mood insights',
      description: 'Retrieves mood insights, trends, and patterns for the authenticated user. Requires view_own_data permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update a specific mood entry
  .put('/:id', withServices(async (services, context) => {
    // Require authentication - ownership will be checked in controller
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.updateMood(context);
  }), {
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    body: t.Object({
      current: t.Optional(t.Union([
        t.Literal('happy'),
        t.Literal('sad'),
        t.Literal('anxious'),
        t.Literal('calm'),
        t.Literal('energetic'),
        t.Literal('depressed'),
        t.Literal('excited'),
        t.Literal('angry'),
        t.Literal('peaceful'),
        t.Literal('stressed')
      ])),
      intensity: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
      triggers: t.Optional(t.Array(t.String({ maxLength: 100 }), { maxItems: 10 })),
      notes: t.Optional(t.String({ maxLength: 500 })),
      context: t.Optional(t.Object({
        location: t.Optional(t.String({ maxLength: 100 })),
        activity: t.Optional(t.String({ maxLength: 100 })),
        weather: t.Optional(t.String({ maxLength: 50 })),
        socialSituation: t.Optional(t.String({ maxLength: 100 })),
      })),
    }),
    detail: {
      tags: ['Mood'],
      summary: 'Update mood entry',
      description: 'Updates a specific mood entry by its ID. Users can only update their own entries.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Delete a specific mood entry
  .delete('/:id', withServices(async (services, context) => {
    // Require authentication - ownership will be checked in controller
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.deleteMood(context);
  }), {
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Mood'],
      summary: 'Delete mood entry',
      description: 'Deletes a specific mood entry by its ID. Users can only delete their own entries.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Admin route: Get mood analytics for company
  .get('/admin/analytics', withServices(async (services, context) => {
    // Require company admin or super admin role
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
    context.user = user;
    
    const controller = new MoodController(services);
    return await controller.getMoodAnalyticsAdmin(context);
  }), {
    query: t.Optional(t.Object({
      period: t.Optional(t.Union([
        t.Literal('7d'),
        t.Literal('30d'),
        t.Literal('90d'),
        t.Literal('1y')
      ], { default: '30d' })),
      userId: t.Optional(t.String()), // Filter by specific user
      companyId: t.Optional(t.String()), // Filter by company (super admin only)
    })),
    detail: {
      tags: ['Mood', 'Admin'],
      summary: 'Get mood analytics (Admin)',
      description: 'Retrieves mood analytics for company. Company admins see their company data, super admins see all data.',
      security: [{ bearerAuth: [] }],
    },
  });