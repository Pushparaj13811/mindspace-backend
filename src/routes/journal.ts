import { Elysia, t } from 'elysia';
import { withServices, getService, SERVICE_KEYS } from '../core/container/ServiceContainer.js';
import { AuthenticationMiddleware } from '../core/middleware/AuthenticationMiddleware.js';
import { JournalController } from '../controllers/JournalController.js';

// Get authentication middleware from container
const authMiddleware = () => getService<AuthenticationMiddleware>(SERVICE_KEYS.AUTH_MIDDLEWARE);

export const journalRoutes = new Elysia({ prefix: '/journal' })
  
  // Create journal entry
  .post('/', withServices(async (services, context) => {
    // Require authentication and 'create_journal' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'create_journal');
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.createEntry(context);
  }), {
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
          t.Literal('depressed'),
          t.Literal('excited'),
          t.Literal('angry'),
          t.Literal('peaceful'),
          t.Literal('stressed')
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
      description: 'Creates a new journal entry for the authenticated user. Requires create_journal permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get journal entries with pagination and filtering
  .get('/', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'view_own_data');
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.getEntries(context);
  }), {
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
      description: 'Retrieves journal entries for the authenticated user with pagination and filtering. Requires view_own_data permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Search journal entries
  .get('/search', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'view_own_data');
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.searchEntries(context);
  }), {
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
      description: 'Searches journal entries by title and content for the authenticated user. Requires view_own_data permission.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get specific journal entry
  .get('/:id', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' permission
    const user = await authMiddleware().requireAuthWithPermission(context, 'view_own_data');
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.getEntry(context);
  }), {
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Get journal entry by ID',
      description: 'Retrieves a specific journal entry by its ID. Users can only access their own entries unless they have company data access permissions.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Update journal entry
  .put('/:id', withServices(async (services, context) => {
    // Require authentication and ownership of the journal entry
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.updateEntry(context);
  }), {
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
          t.Literal('depressed'),
          t.Literal('excited'),
          t.Literal('angry'),
          t.Literal('peaceful'),
          t.Literal('stressed')
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
      description: 'Updates a specific journal entry by its ID. Users can only update their own entries.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Delete journal entry
  .delete('/:id', withServices(async (services, context) => {
    // Require authentication and ownership of the journal entry
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.deleteEntry(context);
  }), {
    params: t.Object({
      id: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ['Journal'],
      summary: 'Delete journal entry',
      description: 'Deletes a specific journal entry by its ID. Users can only delete their own entries.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Admin route: Get all journal entries (company admins and super admins)
  .get('/admin/all', withServices(async (services, context) => {
    // Require company admin or super admin role
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.getAllEntriesAdmin(context);
  }), {
    query: t.Optional(t.Object({
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      sortBy: t.Optional(t.Union([
        t.Literal('createdAt'),
        t.Literal('updatedAt'),
        t.Literal('title')
      ])),
      sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      userId: t.Optional(t.String()), // Filter by specific user
      companyId: t.Optional(t.String()), // Filter by company (super admin only)
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
    })),
    detail: {
      tags: ['Journal', 'Admin'],
      summary: 'Get all journal entries (Admin)',
      description: 'Retrieves all journal entries. Company admins see their company entries, super admins see all entries.',
      security: [{ bearerAuth: [] }],
    },
  })

  // Analytics route: Get journal analytics
  .get('/analytics', withServices(async (services, context) => {
    // Require authentication and 'view_own_data' or 'view_company_data' permission
    const user = await authMiddleware().requireAuthWithAnyPermission(context, ['view_own_data', 'view_company_data']);
    context.user = user;
    
    const controller = new JournalController(services);
    return await controller.getJournalAnalytics(context);
  }), {
    query: t.Optional(t.Object({
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      companyId: t.Optional(t.String()), // Super admin can specify company
    })),
    detail: {
      tags: ['Journal', 'Analytics'],
      summary: 'Get journal analytics',
      description: 'Retrieves analytics data for journals. Individual users see their own data, company roles see company data.',
      security: [{ bearerAuth: [] }],
    },
  });