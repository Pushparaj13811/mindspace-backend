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
            this.logError(new Error('Email service connection failed'), 'email_connection_test', user.$id);
            // Continue with registration even if email fails
          } else {

          // Send welcome email
          await this.services.emailService.sendWelcomeEmail(user.email, user.name);
          this.logAction('welcome_email_sent', user.$id, { email: user.email });
          
          // Always send verification email for now (since Appwrite might not be configured)
          // Generate a simple verification token (in production, use crypto.randomBytes)
          const verificationToken = Buffer.from(`${user.$id}:${Date.now()}`).toString('base64');
          
          await this.services.emailService.sendVerificationEmail(
            user.email, 
            user.name, 
            verificationToken
          );
          this.logAction('verification_email_sent', user.$id, { 
            email: user.email,
            method: 'custom'
          });
          }
          
        } catch (emailError) {
          // Log email error but don't fail registration
          this.logError(emailError as Error, 'send_registration_emails', user.$id);
        }
      } else {
        this.logError(new Error('Email service not available'), 'email_service_check', user.$id);
      }
      
      this.logAction('register_success', user.$id, { email: user.email });
      
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
      
      this.logAction('login_success', user.$id, { email: user.email });
      
      return this.success(
        { user, session }, 
        SUCCESS_MESSAGES.LOGIN_SUCCESS
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Invalid email or password')) {
          set.status = HTTP_STATUS.UNAUTHORIZED;
          return this.error(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
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
  async getCurrentUser(context: { user?: any; session?: string; set: any }) {
    const { user, session, set } = context;
    
    try {
      const { user: authUser, session: authSession } = this.requireAuth(user, session, set);
      
      this.logAction('get_profile', authUser.$id);
      
      // Get fresh user data
      const userProfile = await this.services.authService.getCurrentUser(authSession);
      
      return this.success({ user: userProfile });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Authentication required') {
        return this.handleAuthError(error, set);
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(context: { 
    user?: any; 
    session?: string; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser, session: authSession } = this.requireAuth(user, session, set);
      
      this.logAction('update_profile_attempt', authUser.$id);
      
      // Validate request body
      const validatedData = this.validateRequestBody(updateProfileSchema, body);
      
      // Update profile through service
      const updatedUser = await this.services.authService.updateProfile(
        authSession, 
        validatedData
      );
      
      this.logAction('update_profile_success', authUser.$id);
      
      return this.success(
        { user: updatedUser }, 
        SUCCESS_MESSAGES.PROFILE_UPDATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(context: { 
    user?: any; 
    session?: string; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser, session: authSession } = this.requireAuth(user, session, set);
      
      this.logAction('update_preferences_attempt', authUser.$id);
      
      // Validate request body
      const validatedData = this.validateRequestBody(updatePreferencesSchema, body);
      
      // Update preferences through service
      const updatedUser = await this.services.authService.updatePreferences(
        authSession, 
        validatedData
      );
      
      this.logAction('update_preferences_success', authUser.$id);
      
      return this.success(
        { user: updatedUser }, 
        SUCCESS_MESSAGES.PREFERENCES_UPDATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Change user password
   */
  async changePassword(context: { 
    user?: any; 
    session?: string; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser, session: authSession } = this.requireAuth(user, session, set);
      
      this.logAction('change_password_attempt', authUser.$id);
      
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
        authSession, 
        currentPassword, 
        newPassword
      );
      
      this.logAction('change_password_success', authUser.$id);
      
      return this.success(
        { message: 'Password changed successfully' }
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Current password is incorrect')) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return this.error('Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
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
          this.logAction('oauth2_welcome_email_sent', user.$id, { email: user.email });
        } catch (emailError) {
          // Log email error but don't fail OAuth2 authentication
          this.logError(emailError as Error, 'send_oauth2_welcome_email', user.$id);
        }
      }
      
      this.logAction('oauth2_success', user.$id, { 
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
  async resendVerification(context: { session?: string; set: any }) {
    const { session, set } = context;
    
    try {
      this.logAction('resend_verification_attempt');
      
      // Check authentication
      if (!session) {
        return this.handleAuthError(new Error('Authentication required'), set);
      }
      
      // Create new email verification
      await this.services.authService.createEmailVerification(session);
      
      this.logAction('resend_verification_success');
      
      return this.success(
        { message: 'Verification email sent successfully' },
        'Verification email has been sent to your registered email address'
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already verified')) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return this.error('Email is already verified', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Confirm email verification
   */
  async confirmVerification(context: { query: unknown; set: any }) {
    const { query, set } = context;
    
    try {
      this.logAction('confirm_verification_attempt');
      
      // Validate query parameters
      const validatedQuery = this.validateQueryParams(
        z.object({
          userId: z.string(),
          secret: z.string()
        }),
        query
      );
      
      // Confirm email verification
      await this.services.authService.confirmEmailVerification(
        validatedQuery.userId,
        validatedQuery.secret
      );
      
      this.logAction('confirm_verification_success', validatedQuery.userId);
      
      return this.success(
        { verified: true },
        'Email verified successfully'
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('Invalid or expired')) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return this.error('Invalid or expired verification link', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }
}