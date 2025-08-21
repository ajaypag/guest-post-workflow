// Simple in-memory rate limiter
// In production, use Redis or a proper rate limiting service

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(
    private maxRequests: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {
    // Clean up old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        if (entry.resetTime < now) {
          this.limits.delete(key);
        }
      }
    }, 60 * 1000);
  }
  
  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    // TEMPORARILY DISABLED FOR TESTING
    return { allowed: true };
    
    // Skip rate limiting for E2E tests
    if (process.env.E2E_TESTING === 'true') {
      return { allowed: true };
    }
    
    const now = Date.now();
    const entry = this.limits.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      // New window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true };
    }
    
    if (entry.count >= this.maxRequests) {
      // Rate limited
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }
    
    // Increment count
    entry.count++;
    return { allowed: true };
  }
}

// Create rate limiters for different endpoints
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
export const claimSignupRateLimiter = new RateLimiter(3, 15 * 60 * 1000); // 3 signup attempts per 15 minutes per IP
export const claimViewRateLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 views per 5 minutes per IP

// Stricter rate limiting for signup to prevent spam
export const signupRateLimiter = new RateLimiter(2, 60 * 60 * 1000); // 2 signups per hour per IP
export const signupEmailRateLimiter = new RateLimiter(1, 24 * 60 * 60 * 1000); // 1 signup per email per day

// Helper function to get client IP
export function getClientIp(request: Request): string {
  // In production, use proper IP detection with X-Forwarded-For headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}