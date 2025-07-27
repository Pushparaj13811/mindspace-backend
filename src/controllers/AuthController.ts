import { BaseController } from './BaseController.js';
import { 
  loginSchema, 
  registerSchema, 
  updateProfileSchema, 
  updatePreferencesSchema,
  oauth2RequestSchema,
  oauth2CallbackSchema
} from '../utils/validation.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import { OAuth2ErrorHandler } from '../utils/OAuth2ErrorHandler.js';
import { z } from 'zod';
import { verificationStore } from '../utils/verificationStore.js';
import crypto from 'crypto';

/**
 * Authentication Controller
 * Handles all authentication-related operations
 */
export class AuthController extends BaseController {
  
  /**
   * Register a new user
   */
  async register(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('register_attempt');
      
      // Validate request body
      const validatedData = this.validateRequestBody(registerSchema, body);
      
      // Register user through service
      const { user, session } = await this.services.authService.register(validatedData);
      
      // Send emails (non-blocking)
      if (this.services.emailService) {
        try {
          // Test email service connection first
          const emailConnected = await this.services.emailService.testConnection();
          if (!emailConnected) {
            this.logError(new Error('Email service connection failed'), 'email_connection_test', user);
            // Continue with registration even if email fails
          } else {

          // Send welcome email
          await this.services.emailService.sendWelcomeEmail(user.email, user.name);
          this.logAction('welcome_email_sent', user, { email: user.email });
          
          // Always send custom verification email
          // Generate a secure verification token
          const verificationToken = crypto.randomBytes(32).toString('hex');
          
          // Store the token in our verification store
          verificationStore.storeToken(user.$id, user.email, verificationToken, 24); // 24 hours expiry
          
          await this.services.emailService.sendVerificationEmail(
            user.email, 
            user.name, 
            verificationToken
          );
          this.logAction('custom_verification_email_sent', user, { 
            email: user.email,
            tokenPreview: verificationToken.substring(0, 8) + '...' // Log partial token for debugging
          });
          }
          
        } catch (emailError) {
          // Log email error but don't fail registration
          this.logError(emailError as Error, 'send_registration_emails', user);
        }
      } else {
        this.logError(new Error('Email service not available'), 'email_service_check', user);
      }
      
      this.logAction('register_success', user, { email: user.email });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { user, session }, 
        SUCCESS_MESSAGES.REGISTER_SUCCESS, 
        HTTP_STATUS.CREATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('already exists')) {
          set.status = HTTP_STATUS.CONFLICT;
          return this.error(ERROR_MESSAGES.ACCOUNT_EXISTS, HTTP_STATUS.CONFLICT);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Login user
   */
  async login(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('login_attempt');
      
      // Validate request body
      const validatedData = this.validateRequestBody(loginSchema, body);
      
      // Login user through service
      const { user, session } = await this.services.authService.login(validatedData);
      
      this.logAction('login_success', user, { email: user.email });
      
      return this.success(
        { user, session }, 
        SUCCESS_MESSAGES.LOGIN_SUCCESS
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('refresh_token_attempt');
      
      const { refreshToken } = body as { refreshToken: string };
      
      if (!refreshToken) {
        throw new Error('Validation error: Refresh token is required');
      }
      
      // Refresh token through service
      const tokens = await this.services.authService.refreshToken(refreshToken);
      
      this.logAction('refresh_token_success');
      
      return this.success(
        { session: tokens }, 
        'Token refreshed successfully'
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Refresh token expired') || 
            error.message.includes('invalid')) {
          set.status = HTTP_STATUS.UNAUTHORIZED;
          return this.error('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Logout user
   */
  async logout(context: { session?: string; set: any }) {
    const { session, set } = context;
    
    try {
      this.logAction('logout_attempt');
      
      if (session) {
        await this.services.authService.logout(session);
        this.logAction('logout_success');
      }
      
      return this.success(
        { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS }
      );
      
    } catch (error) {
      // Always return success for logout, even if there's an error
      this.logAction('logout_error', undefined, { error: (error as Error).message });
      return this.success(
        { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS }
      );
    }
  }

  /**
   * Get current user profile
   */
  async getUserProfile(context: any) {
    const { set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      this.logAction('get_profile', user);
      
      // Get fresh user data using auth service
      const userProfile = await this.services.authService.getUserById(user.$id);
      
      return this.success({ user: userProfile });
      
    } catch (error) {
      this.logError(error as Error, 'get_profile');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission to update profile
      await this.requirePermission(user, 'manage_profile');
      
      this.logAction('update_profile_attempt', user);
      
      // Validate request body
      const validatedData = this.validateRequestBody(updateProfileSchema, body);
      
      // Update profile through service
      const updatedUser = await this.services.authService.updateProfile(
        user.$id, 
        validatedData
      );
      
      this.logAction('update_profile_success', user);
      
      return this.success(
        { user: updatedUser }, 
        SUCCESS_MESSAGES.PROFILE_UPDATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'update_profile_attempt');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission to update profile
      await this.requirePermission(user, 'manage_profile');
      
      this.logAction('update_preferences_attempt', user);
      
      // Validate request body
      const validatedData = this.validateRequestBody(updatePreferencesSchema, body);
      
      // Update preferences through service
      const updatedUser = await this.services.authService.updatePreferences(
        user.$id, 
        validatedData
      );
      
      this.logAction('update_preferences_success', user);
      
      return this.success(
        { user: updatedUser }, 
        SUCCESS_MESSAGES.PREFERENCES_UPDATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'update_preferences_attempt');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Change user password
   */
  async changePassword(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission to change password
      await this.requirePermission(user, 'manage_profile');
      
      this.logAction('change_password_attempt', user);
      
      const { currentPassword, newPassword } = body as { 
        currentPassword: string; 
        newPassword: string; 
      };
      
      if (!currentPassword || !newPassword) {
        throw new Error('Validation error: Current password and new password are required');
      }
      
      if (newPassword.length < 8) {
        throw new Error('Validation error: New password must be at least 8 characters long');
      }
      
      // Change password through service
      await this.services.authService.changePassword(
        user.$id, 
        currentPassword, 
        newPassword
      );
      
      this.logAction('change_password_success', user);
      
      return this.success(
        { message: 'Password changed successfully' }
      );
      
    } catch (error) {
      this.logError(error as Error, 'change_password_attempt');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('password_reset_request');
      
      const { email } = body as { email: string };
      
      if (!email) {
        throw new Error('Validation error: Email is required');
      }
      
      // Request password reset through service
      await this.services.authService.resetPassword(email);
      
      this.logAction('password_reset_sent', undefined, { email });
      
      return this.success(
        { message: 'Password reset email sent if account exists' }
      );
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation error')) {
        return this.handleValidationError(error, set);
      }
      
      // Always return success for security (don't reveal if email exists)
      return this.success(
        { message: 'Password reset email sent if account exists' }
      );
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('confirm_password_reset_attempt');
      
      const { token, password } = body as { token: string; password: string };
      
      if (!token || !password) {
        throw new Error('Validation error: Token and password are required');
      }
      
      if (password.length < 8) {
        throw new Error('Validation error: Password must be at least 8 characters long');
      }
      
      // Confirm password reset through service
      await this.services.authService.confirmPasswordReset(token, password);
      
      this.logAction('confirm_password_reset_success');
      
      return this.success(
        { message: 'Password reset successfully' }
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Invalid or expired reset token') ||
            error.message.includes('Invalid reset token') ||
            error.message.includes('Invalid token format')) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return this.error('Invalid or expired reset token', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Initiate OAuth2 authentication flow
   */
  async initiateOAuth2(context: { body: unknown; set: any }) {
    const { body, set } = context;
    
    try {
      this.logAction('oauth2_initiate');
      
      // Validate request body
      const validatedData = this.validateRequestBody(oauth2RequestSchema, body);
      
      // Create OAuth2 session through service
      const redirectUrl = await this.services.authService.createOAuth2Session(
        validatedData.provider,
        validatedData.successUrl,
        validatedData.failureUrl
      );
      
      this.logAction('oauth2_redirect_created', undefined, { provider: validatedData.provider });
      
      return this.success(
        { redirectUrl },
        SUCCESS_MESSAGES.OAUTH2_SESSION_CREATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        
        // Handle OAuth2-specific errors using the dedicated handler
        if (OAuth2ErrorHandler.isOAuth2Error(error)) {
          OAuth2ErrorHandler.logOAuth2Error(error, {
            action: 'oauth2_initiate',
            provider: 'google'
          });
          
          const { status, message } = OAuth2ErrorHandler.handleOAuth2Error(error);
          set.status = status;
          return this.error(message, status);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Handle OAuth2 callback and create user session
   */
  async handleOAuth2Callback(context: { query: unknown; set: any }) {
    const { query, set } = context;
    
    try {
      this.logAction('oauth2_callback');
      
      // Validate query parameters
      const validatedQuery = this.validateQueryParams(oauth2CallbackSchema, query);
      
      // Process OAuth2 callback through service
      const { user, session } = await this.services.authService.handleOAuth2Callback(
        validatedQuery.userId,
        validatedQuery.secret
      );
      
      // Send welcome email for OAuth2 users (non-blocking)
      // Note: For OAuth2, we can't easily detect if user is new, so we send welcome email
      // The EmailService should handle duplicate emails gracefully
      if (this.services.emailService) {
        try {
          await this.services.emailService.sendWelcomeEmail(user.email, user.name);
          this.logAction('oauth2_welcome_email_sent', user, { email: user.email });
        } catch (emailError) {
          // Log email error but don't fail OAuth2 authentication
          this.logError(emailError as Error, 'send_oauth2_welcome_email', user);
        }
      }
      
      this.logAction('oauth2_success', user, { 
        email: user.email, 
        provider: 'google' 
      });
      
      return this.success(
        { user, session },
        SUCCESS_MESSAGES.OAUTH2_AUTHENTICATION_SUCCESS
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        
        // Handle OAuth2-specific errors using the dedicated handler
        if (OAuth2ErrorHandler.isOAuth2Error(error)) {
          OAuth2ErrorHandler.logOAuth2Error(error, {
            action: 'oauth2_callback',
            provider: 'google'
          });
          
          const { status, message } = OAuth2ErrorHandler.handleOAuth2Error(error);
          set.status = status;
          return this.error(message, status);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Resend email verification
   */
  async resendVerification(context: any) {
    const { set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      this.logAction('resend_verification_attempt', user);
      
      // Get fresh user data to check current verification status
      const freshUser = await this.services.authService.getUserById(user.$id);
      
      // Check if email is already verified using fresh data
      if (freshUser.emailVerified) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return this.error('Email is already verified', HTTP_STATUS.BAD_REQUEST);
      }
      
      // Create new email verification
      await this.services.authService.createEmailVerification(user.$id);
      
      this.logAction('resend_verification_success', user);
      
      return this.success(
        { message: 'Verification email sent successfully' },
        'Verification email has been sent to your registered email address'
      );
      
    } catch (error) {
      this.logError(error as Error, 'resend_verification_attempt');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Confirm email verification (custom verification)
   */
  async confirmVerification(context: { query: unknown; set: any }) {
    const { query, set } = context;
    
    try {
      this.logAction('confirm_verification_attempt');
      
      // Validate query parameters - only need token for custom verification
      const validatedQuery = this.validateQueryParams(
        z.object({
          token: z.string()
        }),
        query
      );
      
      // Verify token using auth service (which updates Appwrite user preferences)
      const verificationResult = await this.services.authService.confirmEmailVerification(validatedQuery.token);
      
      this.logAction('confirm_verification_success', undefined, {
        userId: verificationResult.userId,
        email: verificationResult.email
      });
      
      return this.success(
        { 
          verified: true,
          userId: verificationResult.userId,
          email: verificationResult.email
        },
        'Email verified successfully'
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Invalid or expired verification link')) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return this.error('Invalid or expired verification link', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }
}