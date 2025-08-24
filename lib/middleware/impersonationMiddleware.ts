/**
 * Impersonation Middleware
 * 
 * Enforces action restrictions during impersonation sessions
 * and logs all actions for audit purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export class ImpersonationMiddleware {
  // Define restricted paths that cannot be accessed during impersonation
  private static restrictedPaths = [
    '/api/billing/:path*',
    '/api/auth/change-password',
    '/api/users/delete',
    '/api/payments/process/:path*',
    '/api/account/delete',
    '/api/stripe/:path*',
    '/api/admin/:path*', // Prevent admin actions during impersonation
    '/api/settings/security/:path*', // Prevent security changes
    '/api/invitations/send', // Prevent sending invitations
  ];
  
  /**
   * Check if the current request should be blocked during impersonation
   */
  static async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // Get the full session state (not just AuthSession)
      const session = await AuthServiceServer.getSessionState(request);
      
      // If not impersonating, allow all actions
      if (!session?.impersonation?.isActive) {
        return null;
      }
      
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      console.log('🛡️ ImpersonationMiddleware: Checking path', {
        pathname,
        method: request.method,
        isImpersonating: true,
        adminUser: session.impersonation.adminUser.email
      });
      
      // Check if path is restricted
      const isRestricted = this.restrictedPaths.some(pattern => {
        try {
          const regexp = pathToRegexp(pattern);
          return regexp.regexp.test(pathname);
        } catch (error) {
          console.error('Invalid path pattern:', pattern, error);
          return false;
        }
      });
      
      // Log the action (both restricted and allowed)
      try {
        await ImpersonationService.logAction(session.impersonation.logId, {
          actionType: isRestricted ? 'RESTRICTED_ATTEMPT' : 'API_CALL',
          endpoint: pathname,
          method: request.method,
          timestamp: new Date(),
          responseStatus: isRestricted ? 403 : undefined,
        });
      } catch (logError) {
        console.error('Failed to log impersonation action:', logError);
        // Don't block the request if logging fails
      }
      
      if (isRestricted) {
        console.warn('⛔ ImpersonationMiddleware: Blocked restricted action', {
          pathname,
          method: request.method,
          adminUser: session.impersonation.adminUser.email,
          targetUser: session.impersonation.targetUser.email
        });
        
        return NextResponse.json({
          error: 'This action is not allowed during impersonation',
          code: 'IMPERSONATION_RESTRICTED',
          details: {
            action: pathname,
            reason: 'Security policy prevents this action during impersonation sessions'
          }
        }, { status: 403 });
      }
      
      console.log('✅ ImpersonationMiddleware: Action allowed', {
        pathname,
        method: request.method
      });
      
      // Allow the request to proceed
      return null;
      
    } catch (error) {
      console.error('❌ ImpersonationMiddleware: Error processing request', error);
      // On error, fail open (allow the request) to prevent breaking the app
      return null;
    }
  }
  
  /**
   * Check if a specific action is restricted (for UI elements)
   */
  static isActionRestricted(pathname: string): boolean {
    return this.restrictedPaths.some(pattern => {
      try {
        const regexp = pathToRegexp(pattern);
        return regexp.regexp.test(pathname);
      } catch (error) {
        console.error('Invalid path pattern:', pattern, error);
        return false;
      }
    });
  }
  
  /**
   * Get list of restricted actions (for UI display)
   */
  static getRestrictedActions(): string[] {
    return [
      'Billing and payment operations',
      'Password changes',
      'Account deletion',
      'Security settings',
      'Admin panel access',
      'Sending invitations',
      'Stripe operations'
    ];
  }
}