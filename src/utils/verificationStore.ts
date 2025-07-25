/**
 * Simple in-memory verification token store
 * In production, this should be stored in a database or Redis
 */
interface VerificationToken {
  userId: string;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

class VerificationStore {
  private tokens = new Map<string, VerificationToken>();

  /**
   * Store a verification token
   */
  storeToken(userId: string, email: string, token: string, expiresInHours = 24): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expiresInHours * 60 * 60 * 1000));

    this.tokens.set(token, {
      userId,
      email,
      token,
      createdAt: now,
      expiresAt
    });

    // Clean up expired tokens periodically
    this.cleanExpiredTokens();
  }

  /**
   * Verify and consume a token
   */
  verifyToken(token: string): { userId: string; email: string } | null {
    const verification = this.tokens.get(token);
    
    if (!verification) {
      return null;
    }

    // Check if token has expired
    if (new Date() > verification.expiresAt) {
      this.tokens.delete(token);
      return null;
    }

    // Token is valid, consume it (one-time use)
    this.tokens.delete(token);
    
    return {
      userId: verification.userId,
      email: verification.email
    };
  }

  /**
   * Clean up expired tokens
   */
  private cleanExpiredTokens(): void {
    const now = new Date();
    for (const [token, verification] of this.tokens.entries()) {
      if (now > verification.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Get token count (for debugging)
   */
  getTokenCount(): number {
    this.cleanExpiredTokens();
    return this.tokens.size;
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore();