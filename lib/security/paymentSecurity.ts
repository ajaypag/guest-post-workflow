import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { NextRequest } from 'next/server';

/**
 * Enhanced Payment Security Module
 * Implements additional security layers beyond Stripe's built-in protection
 */
export class PaymentSecurity {
  
  /**
   * Advanced webhook signature validation with replay attack prevention
   */
  static validateWebhookWithTimestamp(
    payload: string,
    signature: string,
    secret: string,
    tolerance: number = 300 // 5 minutes
  ): { isValid: boolean; timestamp: number } {
    try {
      const elements = signature.split(',');
      const timestamp = parseInt(elements.find(e => e.startsWith('t='))?.substring(2) || '0');
      const signatures = elements.filter(e => e.startsWith('v1='));

      if (!timestamp || signatures.length === 0) {
        return { isValid: false, timestamp: 0 };
      }

      // Check timestamp tolerance (replay attack prevention)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - timestamp) > tolerance) {
        console.warn('Webhook timestamp outside tolerance window');
        return { isValid: false, timestamp };
      }

      // Verify signature
      const expectedSig = createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      const isValid = signatures.some(sig => {
        const providedSig = sig.substring(3);
        return timingSafeEqual(
          Buffer.from(expectedSig, 'hex'),
          Buffer.from(providedSig, 'hex')
        );
      });

      return { isValid, timestamp };
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return { isValid: false, timestamp: 0 };
    }
  }

  /**
   * Enhanced rate limiting with progressive penalties
   */
  static createAdaptiveRateLimit() {
    const violations = new Map<string, { count: number; lastViolation: number }>();
    
    return (req: NextRequest): { allowed: boolean; resetTime: number } => {
      const ip = this.getClientIP(req);
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute base window
      
      const violation = violations.get(ip);
      
      // Progressive penalty system
      let maxRequests = 100; // Base limit
      let currentWindow = windowMs;
      
      if (violation) {
        const timeSinceLastViolation = now - violation.lastViolation;
        
        // If recent violations, reduce limits and extend window
        if (timeSinceLastViolation < 5 * 60 * 1000) { // 5 minutes
          maxRequests = Math.max(10, 100 - (violation.count * 10));
          currentWindow = windowMs * Math.min(5, violation.count);
        }
      }
      
      // Check current rate
      const requests = this.getRequestCount(ip, currentWindow);
      const allowed = requests < maxRequests;
      
      if (!allowed) {
        // Record violation
        const currentViolation = violations.get(ip) || { count: 0, lastViolation: 0 };
        violations.set(ip, {
          count: currentViolation.count + 1,
          lastViolation: now
        });
      }
      
      return {
        allowed,
        resetTime: now + currentWindow
      };
    };
  }

  /**
   * Payment amount validation with fraud detection
   */
  static validatePaymentAmount(
    requestedAmount: number,
    expectedAmount: number,
    currency: string,
    context: {
      orderId: string;
      accountId: string;
      userAgent?: string;
      ip?: string;
    }
  ): { isValid: boolean; riskScore: number; warnings: string[] } {
    const warnings: string[] = [];
    let riskScore = 0;

    // Basic amount validation
    if (requestedAmount !== expectedAmount) {
      warnings.push('Payment amount mismatch');
      riskScore += 50;
    }

    // Suspicious amount patterns
    if (requestedAmount > 100000) { // $1,000+
      warnings.push('High-value transaction');
      riskScore += 20;
    }

    if (requestedAmount % 100 !== 0) { // Non-round dollar amounts are less common in B2B
      riskScore += 5;
    }

    // Currency validation
    if (!['USD', 'EUR', 'GBP', 'CAD'].includes(currency)) {
      warnings.push('Unusual currency');
      riskScore += 15;
    }

    // Rapid successive attempts (would need session storage)
    // TODO: Implement attempt frequency checking

    return {
      isValid: warnings.length === 0 || (warnings.length === 1 && warnings[0] === 'High-value transaction'),
      riskScore,
      warnings
    };
  }

  /**
   * Generate secure payment session token
   */
  static generateSecurePaymentToken(orderId: string, accountId: string): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(16).toString('hex');
    const data = `${orderId}:${accountId}:${timestamp}:${random}`;
    
    const hmac = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const signature = hmac.update(data).digest('hex');
    
    return Buffer.from(`${data}:${signature}`).toString('base64url');
  }

  /**
   * Validate secure payment session token
   */
  static validatePaymentToken(
    token: string,
    expectedOrderId: string,
    expectedAccountId: string,
    maxAge: number = 30 * 60 * 1000 // 30 minutes
  ): { isValid: boolean; isExpired: boolean } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      
      if (parts.length !== 5) {
        return { isValid: false, isExpired: false };
      }

      const [orderId, accountId, timestamp, random, signature] = parts;
      
      // Verify content
      if (orderId !== expectedOrderId || accountId !== expectedAccountId) {
        return { isValid: false, isExpired: false };
      }

      // Check expiration
      const tokenTime = parseInt(timestamp);
      const isExpired = Date.now() - tokenTime > maxAge;

      // Verify signature
      const data = `${orderId}:${accountId}:${timestamp}:${random}`;
      const hmac = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret');
      const expectedSignature = hmac.update(data).digest('hex');
      
      const isValid = timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      return { isValid, isExpired };
    } catch (error) {
      return { isValid: false, isExpired: false };
    }
  }

  /**
   * Audit log for payment events
   */
  static async auditLog(event: {
    type: 'payment_initiated' | 'payment_succeeded' | 'payment_failed' | 'refund_processed' | 'dispute_received';
    orderId: string;
    accountId: string;
    paymentIntentId?: string;
    amount: number;
    currency: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // TODO: Implement secure audit logging to dedicated audit table
    console.log('PAYMENT_AUDIT:', {
      ...event,
      timestamp: new Date().toISOString(),
    });

    // In production, this should:
    // 1. Write to a separate, append-only audit table
    // 2. Include digital signatures for tamper-proofing
    // 3. Potentially send to external logging service (e.g., Datadog, Splunk)
    // 4. Trigger alerts for high-risk events
  }

  /**
   * GDPR/Privacy compliance helpers
   */
  static sanitizePaymentDataForLogging(data: any): any {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'client_secret',
      'payment_method',
      'source',
      'last_payment_error',
      'next_action',
      'charges'
    ];

    function recursiveClean(obj: any) {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key)) {
          cleaned[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          cleaned[key] = recursiveClean(value);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }

    return recursiveClean(sanitized);
  }

  /**
   * Data retention policy enforcement
   */
  static async enforceDataRetention(): Promise<void> {
    // TODO: Implement automated data cleanup based on retention policies
    // - Remove old payment intent client secrets (after 24 hours)
    // - Archive old transaction data (after 7 years for compliance)
    // - Anonymize customer data upon request (GDPR right to be forgotten)
  }

  // Helper methods

  private static getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || 'unknown';
  }

  private static requestCounts = new Map<string, Array<{ timestamp: number }>>();

  private static getRequestCount(ip: string, windowMs: number): number {
    const now = Date.now();
    const requests = this.requestCounts.get(ip) || [];
    
    // Clean old requests
    const validRequests = requests.filter(req => now - req.timestamp < windowMs);
    
    // Add current request
    validRequests.push({ timestamp: now });
    this.requestCounts.set(ip, validRequests);
    
    return validRequests.length;
  }
}

/**
 * Compliance helper for PCI DSS requirements
 */
export class PCIComplianceHelper {
  /**
   * Validate that payment data handling meets PCI requirements
   */
  static validatePCICompliance(): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check environment configuration
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
      violations.push('Invalid Stripe secret key configuration');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
      violations.push('Webhook endpoint secret not properly configured');
    }

    // Check HTTPS enforcement
    if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('https://')) {
      violations.push('HTTPS not enforced in production');
    }

    // Recommendations for enhanced security
    recommendations.push('Implement regular security scanning');
    recommendations.push('Set up monitoring for failed payment attempts');
    recommendations.push('Regular review of access logs');
    recommendations.push('Implement WAF (Web Application Firewall)');

    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
}