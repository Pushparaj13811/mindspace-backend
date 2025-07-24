/**
 * Email Service Interface
 * Defines the contract for email sending functionality
 */
export interface IEmailService {
  /**
   * Send welcome email to new users
   */
  sendWelcomeEmail(to: string, name: string): Promise<void>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void>;

  /**
   * Send email verification email
   */
  sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<void>;

  /**
   * Test email service connection
   */
  testConnection(): Promise<boolean>;
}