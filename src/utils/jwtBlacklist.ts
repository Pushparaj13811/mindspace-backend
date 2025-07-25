import { logger } from './logger.js';

interface BlacklistedToken {
  jti: string; // JWT ID
  userId: string;
  blacklistedAt: number;
  expiresAt: number;
}

class JWTBlacklist {
  private blacklistedTokens = new Map<string, BlacklistedToken>();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up expired blacklisted tokens every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000);

    logger.info('JWT blacklist initialized');
  }

  /**
   * Blacklist a JWT token
   */
  blacklistToken(jti: string, userId: string, expiresAt: number): void {
    const now = Date.now();
    
    this.blacklistedTokens.set(jti, {
      jti,
      userId,
      blacklistedAt: now,
      expiresAt
    });

    logger.info('JWT token blacklisted', {
      jti: jti.substring(0, 8) + '...',
      userId,
      expiresAt: new Date(expiresAt).toISOString()
    });
  }

  /**
   * Check if a JWT token is blacklisted
   */
  isBlacklisted(jti: string): boolean {
    const blacklistedToken = this.blacklistedTokens.get(jti);
    
    if (!blacklistedToken) {
      return false;
    }

    // Check if token has expired (automatically unblacklisted)
    if (Date.now() > blacklistedToken.expiresAt) {
      this.blacklistedTokens.delete(jti);
      return false;
    }

    logger.warn('Attempted use of blacklisted JWT token', {
      jti: jti.substring(0, 8) + '...',
      userId: blacklistedToken.userId,
      blacklistedAt: new Date(blacklistedToken.blacklistedAt).toISOString()
    });

    return true;
  }

  /**
   * Blacklist all tokens for a specific user (useful for logout all sessions)
   */
  blacklistAllUserTokens(userId: string): void {
    let count = 0;
    
    for (const [, tokenData] of this.blacklistedTokens.entries()) {
      if (tokenData.userId === userId) {
        count++;
      }
    }

    logger.info('Blacklisted all tokens for user', {
      userId,
      tokenCount: count
    });
  }

  /**
   * Clean up expired blacklisted tokens
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [jti, tokenData] of this.blacklistedTokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.blacklistedTokens.delete(jti);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired blacklisted JWT tokens', { 
        cleanedCount,
        remainingTokens: this.blacklistedTokens.size 
      });
    }
  }

  /**
   * Get statistics about blacklisted tokens
   */
  getStats(): { totalBlacklisted: number; expiredTokens: number } {
    const now = Date.now();
    let expiredTokens = 0;

    for (const tokenData of this.blacklistedTokens.values()) {
      if (now > tokenData.expiresAt) {
        expiredTokens++;
      }
    }

    return {
      totalBlacklisted: this.blacklistedTokens.size,
      expiredTokens
    };
  }

  /**
   * Destroy the blacklist (for cleanup)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.blacklistedTokens.clear();
    logger.info('JWT blacklist destroyed');
  }
}

// Export singleton instance
export const jwtBlacklist = new JWTBlacklist();