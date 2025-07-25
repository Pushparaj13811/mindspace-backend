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
    
    const controller = new CompanyController(services);
    return await controller.listCompanies(context);
  }), {
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
    }),
    detail: {
      tags: ['Companies'],
      summary: 'List all companies',
      description: 'Get a paginated list of all companies (Super admin only)',
      security: [{ BearerAuth: [] }]
    }
  })
  
  .get('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.getCompany(context);
  }))
  
  .patch('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.updateCompany(context);
  }))
  
  .delete('/:companyId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    const controller = new CompanyController(services);
    return await controller.deleteCompany(context);
  }))
  
  // User management within company
  .post('/:companyId/invite', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.inviteUser(context);
  }))
  
  .get('/:companyId/users', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.getCompanyUsers(context);
  }))
  
  .patch('/:companyId/users/:userId/role', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.updateUserRole(context);
  }))
  
  .delete('/:companyId/users/:userId', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.removeUser(context);
  }))
  
  // Analytics
  .get('/:companyId/analytics', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuth(context);
    const controller = new CompanyController(services);
    return await controller.getCompanyAnalytics(context);
  }))
  
  // Platform analytics (Super admin only)
  .get('/platform/analytics', withServices(async (services, context) => {
    const user = await authMiddleware().requireAuthWithAnyRole(context, ['SUPER_ADMIN']);
    const controller = new CompanyController(services);
    return await controller.getPlatformAnalytics(context);
  }))
  
  // Public invite acceptance route (no auth required)
  .post('/invite/:inviteToken/accept', withServices(async (services, context) => {
    const controller = new CompanyController(services);
    return await controller.acceptInvite(context);
  }));