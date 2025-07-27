import { Elysia, t } from 'elysia';
import { withServices, getService, SERVICE_KEYS } from '../core/container/ServiceContainer.js';
import { AuthenticationMiddleware } from '../core/middleware/AuthenticationMiddleware.js';
import { CompanyController } from '../controllers/CompanyController.js';

// Get authentication middleware from container
const authMiddleware = () => getService<AuthenticationMiddleware>(SERVICE_KEYS.AUTH_MIDDLEWARE);

export const companyRoutes = new Elysia({ 
  prefix: '/companies',
  tags: ['Company']
})
  
  // Company management routes (Super admin only)
  .post('/', withServices(async (services, context) => {
    // Require super admin role
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    context.user = user;
    
    const controller = new CompanyController(services);
    return await controller.createCompany(context);
  }), {
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 100 }),
      domain: t.String({ format: 'email' }),
      settings: t.Optional(t.Object({
        allowSelfRegistration: t.Optional(t.Boolean()),
        requireEmailVerification: t.Optional(t.Boolean()),
        dataRetentionDays: t.Optional(t.Number({ minimum: 30, maximum: 2555 }))
      }))
    }),
    detail: {
      tags: ['Company'],
      summary: 'Create a new company',
      description: 'Create a new company (Super admin only)',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .get('/', withServices(async (services, context) => {
    // Require super admin role
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    context.user = user;
    
    const controller = new CompanyController(services);
    return await controller.listCompanies(context);
  }), {
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
    }),
    detail: {
      tags: ['Company'],
      summary: 'List all companies',
      description: 'Get a paginated list of all companies (Super admin only)',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .get('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.getCompany(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    detail: {
      tags: ['Company'],
      summary: 'Get company details',
      description: 'Retrieve detailed information about a specific company. Access controlled by user role and company association.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .patch('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.updateCompany(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
      domain: t.Optional(t.String()),
      logo: t.Optional(t.String({ format: 'uri' })),
      settings: t.Optional(t.Object({
        allowSelfRegistration: t.Optional(t.Boolean()),
        requireEmailVerification: t.Optional(t.Boolean()),
        dataRetentionDays: t.Optional(t.Number({ minimum: 30, maximum: 2555 }))
      }))
    }),
    detail: {
      tags: ['Company'],
      summary: 'Update company',
      description: 'Update company information and settings. Requires company admin or super admin role.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .delete('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.deleteCompany(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    detail: {
      tags: ['Company', 'Admin'],
      summary: 'Delete company',
      description: 'Permanently delete a company and all associated data. Super admin only.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  // User management within company
  .post('/:companyId/invite', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.inviteUser(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    body: t.Object({
      email: t.String({ format: 'email' }),
      role: t.Union([t.Literal('COMPANY_ADMIN'), t.Literal('COMPANY_MANAGER'), t.Literal('COMPANY_USER')]),
      name: t.Optional(t.String({ minLength: 2, maxLength: 100 }))
    }),
    detail: {
      tags: ['Company'],
      summary: 'Invite user to company',
      description: 'Send an invitation email to a user to join the company with specified role.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .get('/:companyId/users', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.getCompanyUsers(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
    }),
    detail: {
      tags: ['Company'],
      summary: 'Get company users',
      description: 'Retrieve a list of users belonging to the company with pagination.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .patch('/:companyId/users/:userId/role', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.updateUserRole(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 }),
      userId: t.String({ minLength: 1 })
    }),
    body: t.Object({
      role: t.Union([t.Literal('COMPANY_ADMIN'), t.Literal('COMPANY_MANAGER'), t.Literal('COMPANY_USER')])
    }),
    detail: {
      tags: ['Company'],
      summary: 'Update user role',
      description: 'Update the role of a user within the company. Requires appropriate permissions.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  .delete('/:companyId/users/:userId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.removeUser(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 }),
      userId: t.String({ minLength: 1 })
    }),
    detail: {
      tags: ['Company'],
      summary: 'Remove user from company',
      description: 'Remove a user from the company. The user will lose access to company features.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  // Analytics
  .get('/:companyId/analytics', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.getCompanyAnalytics(context);
  }), {
    params: t.Object({
      companyId: t.String({ minLength: 1 })
    }),
    query: t.Object({
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      period: t.Optional(t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')]))
    }),
    detail: {
      tags: ['Company', 'Analytics'],
      summary: 'Get company analytics',
      description: 'Retrieve analytics and metrics for the company including user activity, wellness trends, and usage statistics.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  // Platform analytics (Super admin only)
  .get('/platform/analytics', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    context.user = user;
    const controller = new CompanyController(services);
    return await controller.getPlatformAnalytics(context);
  }), {
    query: t.Object({
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      period: t.Optional(t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')]))
    }),
    detail: {
      tags: ['Admin', 'Analytics'],
      summary: 'Get platform analytics',
      description: 'Retrieve platform-wide analytics including all companies, revenue metrics, and usage statistics. Super admin only.',
      security: [{ bearerAuth: [] }]
    }
  })
  
  // Public invite acceptance route (no auth required)
  .post('/invite/:inviteToken/accept', withServices(async (services, context) => {
    const controller = new CompanyController(services);
    return await controller.acceptInvite(context);
  }), {
    params: t.Object({
      inviteToken: t.String({ minLength: 1 })
    }),
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 100 }),
      password: t.String({ minLength: 8 })
    }),
    detail: {
      tags: ['Company'],
      summary: 'Accept company invitation',
      description: 'Accept a company invitation using the invite token. Creates a new user account and associates it with the company.',
      // No security required as this is a public endpoint for invite acceptance
    }
  });