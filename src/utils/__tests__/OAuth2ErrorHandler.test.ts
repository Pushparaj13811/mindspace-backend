import { describe, it, expect, beforeEach } from 'bun:test';
import { OAuth2ErrorHandler } from '../OAuth2ErrorHandler.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../response.js';

describe('OAuth2ErrorHandler', () => {

  describe('handleOAuth2Error', () => {
    it('should handle OAuth2 provider not configured error', () => {
      const error = new Error('OAuth2 provider not configured');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(result.message).toBe(ERROR_MESSAGES.OAUTH2_PROVIDER_NOT_CONFIGURED);
      expect(result.errorCode).toBe('OAUTH2_PROVIDER_NOT_CONFIGURED');
    });

    it('should handle OAuth2 session expired error', () => {
      const error = new Error('OAuth2 session expired');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(result.message).toBe(ERROR_MESSAGES.OAUTH2_SESSION_EXPIRED);
      expect(result.errorCode).toBe('OAUTH2_SESSION_EXPIRED');
    });

    it('should handle OAuth2 callback invalid error', () => {
      const error = new Error('OAuth2 callback invalid');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(result.message).toBe(ERROR_MESSAGES.OAUTH2_CALLBACK_INVALID);
      expect(result.errorCode).toBe('OAUTH2_CALLBACK_INVALID');
    });

    it('should handle OAuth2 access denied error', () => {
      const error = new Error('access denied by user');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(result.message).toBe('OAuth2 authorization was denied by the user');
      expect(result.errorCode).toBe('OAUTH2_ACCESS_DENIED');
    });

    it('should handle OAuth2 state mismatch error', () => {
      const error = new Error('state mismatch detected');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(result.message).toBe('OAuth2 state parameter mismatch. Please try again.');
      expect(result.errorCode).toBe('OAUTH2_STATE_MISMATCH');
    });

    it('should handle OAuth2 rate limit error', () => {
      const error = new Error('rate limit exceeded');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(result.message).toBe('OAuth2 rate limit exceeded. Please try again later.');
      expect(result.errorCode).toBe('OAUTH2_RATE_LIMIT');
    });

    it('should handle OAuth2 service unavailable error', () => {
      const error = new Error('service unavailable');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(result.message).toBe('OAuth2 service is temporarily unavailable. Please try again later.');
      expect(result.errorCode).toBe('OAUTH2_SERVICE_UNAVAILABLE');
    });

    it('should handle OAuth2 invalid client error', () => {
      const error = new Error('invalid client_id provided');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(result.message).toBe('OAuth2 client configuration is invalid');
      expect(result.errorCode).toBe('OAUTH2_INVALID_CLIENT');
    });

    it('should handle OAuth2 insufficient scope error', () => {
      const error = new Error('insufficient scope granted');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(result.message).toBe('OAuth2 insufficient permissions granted');
      expect(result.errorCode).toBe('OAUTH2_INSUFFICIENT_SCOPE');
    });

    it('should handle default OAuth2 error', () => {
      const error = new Error('unknown OAuth2 error');
      const result = OAuth2ErrorHandler.handleOAuth2Error(error);

      expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(result.message).toBe(ERROR_MESSAGES.OAUTH2_AUTHENTICATION_FAILED);
      expect(result.errorCode).toBe('OAUTH2_AUTHENTICATION_FAILED');
    });
  });

  describe('isOAuth2Error', () => {
    it('should identify OAuth2 errors correctly', () => {
      const oauth2Errors = [
        new Error('OAuth2 provider not found'),
        new Error('oauth callback failed'),
        new Error('provider configuration invalid'),
        new Error('authorization code expired'),
        new Error('access_token invalid'),
        new Error('refresh_token expired'),
        new Error('client_id not found'),
        new Error('state parameter missing'),
        new Error('scope insufficient'),
      ];

      oauth2Errors.forEach(error => {
        expect(OAuth2ErrorHandler.isOAuth2Error(error)).toBe(true);
      });
    });

    it('should not identify non-OAuth2 errors as OAuth2 errors', () => {
      const nonOAuth2Errors = [
        new Error('Database connection failed'),
        new Error('User not found'),
        new Error('Validation error'),
        new Error('Network timeout'),
        new Error('File not found'),
      ];

      nonOAuth2Errors.forEach(error => {
        expect(OAuth2ErrorHandler.isOAuth2Error(error)).toBe(false);
      });
    });
  });

  describe('logOAuth2Error', () => {
    it('should log OAuth2 error with structured metadata', () => {
      const error = new Error('OAuth2 test error');
      const context = {
        action: 'oauth2_test',
        provider: 'google',
        userId: 'user123',
        metadata: { extra: 'data' }
      };

      // Verify the method doesn't throw
      expect(() => OAuth2ErrorHandler.logOAuth2Error(error, context)).not.toThrow();
    });
  });
});