import crypto from 'crypto';
import { logger } from './logger.js';

interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

class PasswordResetStore {
  private tokens = new Map<string, PasswordResetToken>();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up expired tokens every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000);

    logger.info('Password reset store initialized');
  }

  /**
   * Store a password reset token
   */
  storeToken(userId: string, email: string, expirationHours: number = 1): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (expirationHours * 60 * 60 * 1000);

    this.tokens.set(token, {
      userId,
      email,
      token,
      expiresAt,
      createdAt: now
    });

    logger.info('Password reset token stored', {
      userId,
      email,
      tokenPreview: token.substring(0, 8) + '...',
      expiresIn: expirationHours + ' hours'
    });

    // Clean up any old tokens for this user
    this.cleanupUserTokens(userId);

    return token;
  }

  /**
   * Verify and consume a password reset token
   */
  verifyToken(token: string): { userId: string; email: string } | null {
    const resetData = this.tokens.get(token);
    
    if (!resetData) {
      logger.warn('Password reset token not found', { 
        tokenPreview: token.substring(0, 8) + '...' 
      });
      return null;
    }

    // Check if token has expired
    if (Date.now() > resetData.expiresAt) {
      logger.warn('Password reset token expired', {
        userId: resetData.userId,
        email: resetData.email,
        tokenPreview: token.substring(0, 8) + '...'
      });
      this.tokens.delete(token);
      return null;
    }

    // Token is valid, consume it (remove from store)
    this.tokens.delete(token);
    
    logger.info('Password reset token verified and consumed', {
      userId: resetData.userId,
      email: resetData.email,
      tokenAge: Date.now() - resetData.createdAt
    });

    return {
      userId: resetData.userId,
      email: resetData.email
    };
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [token, resetData] of this.tokens.entries()) {
      if (now > resetData.expiresAt) {
        this.tokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired password reset tokens', { 
        cleanedCount,
        remainingTokens: this.tokens.size 
      });
    }
  }

  /**
   * Clean up old tokens for a specific user (keep only the most recent one)
   */
  private cleanupUserTokens(userId: string): void {
    const userTokens: { token: string; createdAt: number }[] = [];
    
    // Find all tokens for this user
    for (const [token, resetData] of this.tokens.entries()) {
      if (resetData.userId === userId) {
        userTokens.push({ token, createdAt: resetData.createdAt });
      }
    }

    // If user has multiple tokens, keep only the newest one
    if (userTokens.length > 1) {
      userTokens.sort((a, b) => b.createdAt - a.createdAt);
      
      // Remove all but the newest token
      for (let i = 1; i < userTokens.length; i++) {
        const tokenToDelete = userTokens[i];
        if (tokenToDelete) {
          this.tokens.delete(tokenToDelete.token);
        }
      }

      logger.info('Cleaned up old password reset tokens for user', {
        userId,
        removedTokens: userTokens.length - 1
      });
    }
  }

  /**
   * Get statistics about stored tokens
   */
  getStats(): { totalTokens: number; expiredTokens: number } {
    const now = Date.now();
    let expiredTokens = 0;

    for (const resetData of this.tokens.values()) {
      if (now > resetData.expiresAt) {
        expiredTokens++;
      }
    }

    return {
      totalTokens: this.tokens.size,
      expiredTokens
    };
  }

  /**
   * Destroy the store (for cleanup)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.tokens.clear();
    logger.info('Password reset store destroyed');
  }
}

// Export singleton instance
export const passwordResetStore = new PasswordResetStore();