import { Elysia, t } from 'elysia';
import { withServices } from '../container/ServiceContainer.js';
import { authMiddleware } from '../middleware/auth.js';
import { MoodController } from '../controllers/MoodController.js';

export const moodRoutes = new Elysia({ prefix: '/mood' })
  
  // Log a new mood entry
  .post('/', withServices(async (services, context) => {
    const controller = new MoodController(services);
    return await controller.logMood(context);
  }), {
    beforeHandle: authMiddleware,
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
      description: 'Logs a new mood entry for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get mood history with pagination
  .get('/', withServices(async (services, context) => {
    const controller = new MoodController(services);
    return await controller.getMoodHistory(context);
  }), {
    beforeHandle: authMiddleware,
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
      description: 'Retrieves mood history for the authenticated user with pagination and filtering',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get mood insights and trends
  .get('/insights', withServices(async (services, context) => {
    const controller = new MoodController(services);
    return await controller.getMoodInsights(context);
  }), {
    beforeHandle: authMiddleware,
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
      description: 'Retrieves mood insights, trends, and patterns for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update a specific mood entry
  .put('/:id', withServices(async (services, context) => {
    const controller = new MoodController(services);
    return await controller.updateMood(context);
  }), {
    beforeHandle: authMiddleware,
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
      description: 'Updates a specific mood entry by its ID',
      security: [{ bearerAuth: [] }],
    },
  })

  // Delete a specific mood entry
  .delete('/:id', withServices(async (services, context) => {
    const controller = new MoodController(services);
    return await controller.deleteMood(context);
  }), {
    beforeHandle: authMiddleware,
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Mood'],
      summary: 'Delete mood entry',
      description: 'Deletes a specific mood entry by its ID',
      security: [{ bearerAuth: [] }],
    },
  });