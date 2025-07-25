import { Elysia } from 'elysia';
import { CompanyController } from '../controllers/CompanyController.js';
import { authMiddleware, requireSuperAdmin, requireCompanyAdmin, requirePermission } from '../middleware/auth.js';

export const companyRoutes = new Elysia({ prefix: '/companies' })
  .decorate('companyController', new CompanyController())
  
  // Company management routes (Super admin only)
  .post('/', async (context) => {
    await authMiddleware(context);
    await requireSuperAdmin(context);
    return context.companyController.createCompany(context);
  })
  
  .get('/', async (context) => {
    await authMiddleware(context);
    await requireSuperAdmin(context);
    return context.companyController.listCompanies(context);
  })
  
  .get('/:companyId', async (context) => {
    await authMiddleware(context);
    return context.companyController.getCompany(context);
  })
  
  .patch('/:companyId', async (context) => {
    await authMiddleware(context);
    return context.companyController.updateCompany(context);
  })
  
  .delete('/:companyId', async (context) => {
    await authMiddleware(context);
    await requireSuperAdmin(context);
    return context.companyController.deleteCompany(context);
  })
  
  // User management within company
  .post('/:companyId/invite', async (context) => {
    await authMiddleware(context);
    return context.companyController.inviteUser(context);
  })
  
  .get('/:companyId/users', async (context) => {
    await authMiddleware(context);
    return context.companyController.getCompanyUsers(context);
  })
  
  .patch('/:companyId/users/:userId/role', async (context) => {
    await authMiddleware(context);
    return context.companyController.updateUserRole(context);
  })
  
  .delete('/:companyId/users/:userId', async (context) => {
    await authMiddleware(context);
    return context.companyController.removeUser(context);
  })
  
  // Analytics
  .get('/:companyId/analytics', async (context) => {
    await authMiddleware(context);
    return context.companyController.getCompanyAnalytics(context);
  })
  
  // Platform analytics (Super admin only)
  .get('/platform/analytics', async (context) => {
    await authMiddleware(context);
    await requireSuperAdmin(context);
    return context.companyController.getPlatformAnalytics(context);
  })
  
  // Public invite acceptance route (no auth required)
  .post('/invite/:inviteToken/accept', async (context) => {
    return context.companyController.acceptInvite(context);
  });