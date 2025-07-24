import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from './config.js';
import type { AuthTokens } from '../types/index.js';

interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export class JWTService {
  static generateTokens(userId: string, email: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpireTime } as SignOptions
    );

    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpiration(config.jwt.expireTime);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1] || null;
  }

  private static getTokenExpiration(timeString: string): number {
    // Convert time string like '1h', '7d' to seconds
    const timeUnit = timeString.slice(-1);
    const timeValue = parseInt(timeString.slice(0, -1));

    switch (timeUnit) {
      case 's': return timeValue;
      case 'm': return timeValue * 60;
      case 'h': return timeValue * 60 * 60;
      case 'd': return timeValue * 24 * 60 * 60;
      default: return 3600; // Default to 1 hour
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  static getTokenPayload(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}

// Token blacklist for logout functionality
class TokenBlacklist {
  private blacklistedTokens = new Set<string>();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  add(token: string): void {
    this.blacklistedTokens.add(token);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  private cleanup(): void {
    // Remove expired tokens from blacklist
    const tokensToRemove: string[] = [];
    
    for (const token of this.blacklistedTokens) {
      if (JWTService.isTokenExpired(token)) {
        tokensToRemove.push(token);
      }
    }
    
    tokensToRemove.forEach(token => {
      this.blacklistedTokens.delete(token);
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.blacklistedTokens.clear();
  }
}

export const tokenBlacklist = new TokenBlacklist();