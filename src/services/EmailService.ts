import nodemailer from 'nodemailer';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { IEmailService } from '../interfaces/IEmailService.js';

export class EmailService implements IEmailService {
  private transporter: any;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"MindSpace" <${config.email.from}>`,
        to,
        subject: 'Welcome to MindSpace - Your Mental Wellness Journey Begins! 🌟',
        html: this.getWelcomeEmailTemplate(name),
      };

      await this.transporter.sendMail(mailOptions);
      
      logger.info('Welcome email sent successfully', {
        to,
        name,
        subject: mailOptions.subject
      });
    } catch (error) {
      logger.error('Failed to send welcome email', {
        to,
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error - email failure shouldn't block registration
    }
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"MindSpace" <${config.email.from}>`,
        to,
        subject: 'Reset Your MindSpace Password 🔐',
        html: this.getPasswordResetEmailTemplate(name, resetUrl),
      };

      await this.transporter.sendMail(mailOptions);
      
      logger.info('Password reset email sent successfully', {
        to,
        name,
        subject: mailOptions.subject
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        to,
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to send password reset email');
    }
  }

  async sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<void> {
    try {
      const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: `"MindSpace" <${config.email.from}>`,
        to,
        subject: 'Verify Your MindSpace Email Address ✉️',
        html: this.getVerificationEmailTemplate(name, verificationUrl),
      };

      await this.transporter.sendMail(mailOptions);
      
      logger.info('Verification email sent successfully', {
        to,
        name,
        subject: mailOptions.subject
      });
    } catch (error) {
      logger.error('Failed to send verification email', {
        to,
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to send verification email');
    }
  }

  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MindSpace</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .feature { background: white; padding: 15px; border-radius: 8px; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌟 Welcome to MindSpace, ${name}!</h1>
          <p>Your journey to better mental wellness starts here</p>
        </div>
        
        <div class="content">
          <h2>What's Next?</h2>
          <p>We're thrilled to have you join our community of wellness seekers. MindSpace is designed to support your mental health journey with powerful tools and AI-powered insights.</p>
          
          <div class="features">
            <div class="feature">
              <h3>📝 Smart Journaling</h3>
              <p>Express your thoughts and track your emotional patterns</p>
            </div>
            <div class="feature">
              <h3>😊 Mood Tracking</h3>
              <p>Monitor your mood trends and discover what affects your wellbeing</p>
            </div>
            <div class="feature">
              <h3>🤖 AI Wellness Coach</h3>
              <p>Get personalized insights and recommendations</p>
            </div>
            <div class="feature">
              <h3>🎯 Mindfulness Tools</h3>
              <p>Access guided exercises and wellness content</p>
            </div>
          </div>
          
          <p>Ready to begin? Log in to your account and start exploring:</p>
          <a href="${config.app.frontendUrl}/login" class="button">Get Started</a>
          
          <h3>💡 Tips for Success:</h3>
          <ul>
            <li>Log your mood daily for better insights</li>
            <li>Use the journal to reflect on your experiences</li>
            <li>Chat with our AI assistant for personalized guidance</li>
            <li>Set aside a few minutes each day for mindfulness</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Questions? Reply to this email or visit our help center.</p>
          <p>© 2025 MindSpace. Taking care of mental wellness, one step at a time.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
          <p>Hi ${name}, we received a request to reset your password</p>
        </div>
        
        <div class="content">
          <p>Someone requested a password reset for your MindSpace account. If this was you, click the button below to create a new password:</p>
          
          <a href="${resetUrl}" class="button">Reset My Password</a>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link expires in 1 hour for security</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your current password remains unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">${resetUrl}</p>
          
          <p>For your security, if you didn't request this password reset, please contact our support team immediately.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please don't reply to this message.</p>
          <p>© 2025 MindSpace. Your mental wellness, our priority.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getVerificationEmailTemplate(name: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✉️ Verify Your Email</h1>
          <p>Hi ${name}, please verify your email address</p>
        </div>
        
        <div class="content">
          <p>Thanks for signing up for MindSpace! To complete your registration and access all features, please verify your email address by clicking the button below:</p>
          
          <a href="${verificationUrl}" class="button">Verify My Email</a>
          
          <div class="info">
            <strong>ℹ️ Why verify?</strong>
            <ul>
              <li>Secure your account with email-based recovery</li>
              <li>Receive important updates about your wellness journey</li>
              <li>Enable password reset functionality</li>
              <li>Get personalized insights and tips</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
          
          <p>This verification link expires in 24 hours. If you didn't create a MindSpace account, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
          <p>Need help? Contact our support team.</p>
          <p>© 2025 MindSpace. Empowering your mental wellness journey.</p>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}