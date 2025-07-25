/**
 * Email service interface
 */
export interface IEmailService {
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void>;
  sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<void>;
  testConnection(): Promise<boolean>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}