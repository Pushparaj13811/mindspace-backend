export const securitySchemes = {
  bearerAuth: {
    type: 'http' as const,
    scheme: 'bearer' as const,
    bearerFormat: 'JWT',
    description: 'JWT access token obtained from login or OAuth2 authentication'
  }
};