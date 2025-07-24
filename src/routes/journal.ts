import { Elysia, t } from 'elysia';
import { withServices } from '../container/ServiceContainer.js';
import { authMiddleware } from '../middleware/auth.js';
import { JournalController } from '../controllers/JournalController.js';

export const journalRoutes = new Elysia({ prefix: '/journal' })
  
  // Create journal entry
  .post('/', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.createEntry(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 200 }),
      content: t.String({ minLength: 10, maxLength: 10000 }),
      mood: t.Object({
        current: t.Union([
          t.Literal('happy'),
          t.Literal('sad'),
          t.Literal('anxious'),
          t.Literal('calm'),
          t.Literal('energetic'),
          t.Literal('depressed')
        ]),
        intensity: t.Number({ minimum: 1, maximum: 10 }),
        timestamp: t.String(),
        triggers: t.Optional(t.Array(t.String())),
        notes: t.Optional(t.String({ maxLength: 500 })),
      }),
      tags: t.Optional(t.Array(t.String({ maxLength: 50 }), { maxItems: 20 })),
      attachments: t.Optional(t.Object({
        images: t.Optional(t.Array(t.String(), { maxItems: 10 })),
        voiceRecording: t.Optional(t.String()),
      })),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Create journal entry',
      description: 'Creates a new journal entry for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get journal entries with pagination and filtering
  .get('/', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.getEntries(context);
  }), {
    beforeHandle: authMiddleware,
    query: t.Optional(t.Object({
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      sortBy: t.Optional(t.Union([
        t.Literal('createdAt'),
        t.Literal('updatedAt'),
        t.Literal('title')
      ])),
      sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      search: t.Optional(t.String({ maxLength: 100 })),
      tags: t.Optional(t.String()), // Comma-separated tags
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
    })),
    detail: {
      tags: ['Journal'],
      summary: 'Get journal entries',
      description: 'Retrieves journal entries for the authenticated user with pagination and filtering',
      security: [{ bearerAuth: [] }],
    },
  })

  // Search journal entries
  .get('/search', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.searchEntries(context);
  }), {
    beforeHandle: authMiddleware,
    query: t.Object({
      search: t.String({ minLength: 1, maxLength: 100 }),
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      sortBy: t.Optional(t.Union([
        t.Literal('createdAt'),
        t.Literal('updatedAt'),
        t.Literal('title')
      ])),
      sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Search journal entries',
      description: 'Searches journal entries by title and content for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get specific journal entry
  .get('/:id', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.getEntry(context);
  }), {
    beforeHandle: authMiddleware,
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Get journal entry by ID',
      description: 'Retrieves a specific journal entry by its ID',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update journal entry
  .put('/:id', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.updateEntry(context);
  }), {
    beforeHandle: authMiddleware,
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    body: t.Object({
      title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
      content: t.Optional(t.String({ minLength: 10, maxLength: 10000 })),
      mood: t.Optional(t.Object({
        current: t.Union([
          t.Literal('happy'),
          t.Literal('sad'),
          t.Literal('anxious'),
          t.Literal('calm'),
          t.Literal('energetic'),
          t.Literal('depressed')
        ]),
        intensity: t.Number({ minimum: 1, maximum: 10 }),
        timestamp: t.String(),
        triggers: t.Optional(t.Array(t.String())),
        notes: t.Optional(t.String({ maxLength: 500 })),
      })),
      tags: t.Optional(t.Array(t.String({ maxLength: 50 }), { maxItems: 20 })),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Update journal entry',
      description: 'Updates a specific journal entry by its ID',
      security: [{ bearerAuth: [] }],
    },
  })

  // Delete journal entry
  .delete('/:id', withServices(async (services, context) => {
    const controller = new JournalController(services);
    return await controller.deleteEntry(context);
  }), {
    beforeHandle: authMiddleware,
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Delete journal entry',
      description: 'Deletes a specific journal entry by its ID',
      security: [{ bearerAuth: [] }],
    },
  });