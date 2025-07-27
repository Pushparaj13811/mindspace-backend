import type { User } from '../types/index.js';
import { AuthenticationMiddleware } from '../core/middleware/AuthenticationMiddleware.js';

/**
 * Helper functions to streamline authenticated route handlers
 */

/**
 * Helper to authenticate user and set context.user
 */
export async function authenticateAndSetUser(
  authMiddleware: AuthenticationMiddleware,
  context: any,
  authMethod: 'requireAuth' | 'requireAuthWithPermission' | 'requireAuthWithRole' | 'requireAuthWithAnyRole' | 'requireAuthWithAnyPermission',
  ...params: any[]
): Promise<User> {
  let user: User;
  
  switch (authMethod) {
    case 'requireAuth':
      user = await authMiddleware.requireAuth(context);
      break;
    case 'requireAuthWithPermission':
      user = await authMiddleware.requireAuthWithPermission(context, params[0]);
      break;
    case 'requireAuthWithRole':
      user = await authMiddleware.requireAuthWithRole(context, params[0]);
      break;
    case 'requireAuthWithAnyRole':
      user = await authMiddleware.requireAuthWithAnyRole(context, params[0]);
      break;
    case 'requireAuthWithAnyPermission':
      user = await authMiddleware.requireAuthWithAnyPermission(context, params[0]);
      break;
    default:
      throw new Error(`Unsupported auth method: ${authMethod}`);
  }
  
  // Set user on context for controller access
  context.user = user;
  
  return user;
}

/**
 * Higher-order function to create authenticated route handlers
 */
export function withAuth(
  authMiddleware: () => AuthenticationMiddleware,
  authMethod: 'requireAuth' | 'requireAuthWithPermission' | 'requireAuthWithRole' | 'requireAuthWithAnyRole' | 'requireAuthWithAnyPermission',
  ...authParams: any[]
) {
  return function<T extends (services: any, context: any) => any>(handler: T): T {
    return (async (services: any, context: any) => {
      // Authenticate and set user on context
      await authenticateAndSetUser(authMiddleware(), context, authMethod, ...authParams);
      
      // Call the original handler
      return await handler(services, context);
    }) as T;
  };
}

/**
 * Convenience functions for common authentication patterns
 */
export const withRequiredAuth = (authMiddleware: () => AuthenticationMiddleware) => 
  withAuth(authMiddleware, 'requireAuth');

export const withPermission = (authMiddleware: () => AuthenticationMiddleware, permission: string) =>
  withAuth(authMiddleware, 'requireAuthWithPermission', permission);

export const withRole = (authMiddleware: () => AuthenticationMiddleware, role: string) =>
  withAuth(authMiddleware, 'requireAuthWithRole', role);

export const withAnyRole = (authMiddleware: () => AuthenticationMiddleware, roles: string[]) =>
  withAuth(authMiddleware, 'requireAuthWithAnyRole', roles);

export const withAnyPermission = (authMiddleware: () => AuthenticationMiddleware, permissions: string[]) =>
  withAuth(authMiddleware, 'requireAuthWithAnyPermission', permissions);