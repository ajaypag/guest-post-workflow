import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { SessionManager } from './services/sessionManager';
import { SessionState } from './types/session';
import { db } from './db/connection';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { AuthSession, UserType, UserRole } from './types/auth';

// Re-export for backward compatibility
export type { AuthSession };

// Helper function to convert SessionState to AuthSession for backward compatibility
function sessionStateToAuthSession(session: SessionState): AuthSession {
  return {
    userId: session.currentUser.userId,
    email: session.currentUser.email,
    name: session.currentUser.name,
    role: session.currentUser.role as UserRole,
    userType: session.currentUser.userType as UserType,
    accountId: session.currentUser.accountId,
    clientId: undefined, // Will be populated if needed
    companyName: session.currentUser.companyName,
    publisherId: session.currentUser.publisherId,
    status: session.currentUser.status,
  };
}

export class AuthServiceServer {
  static async getSession(request?: NextRequest): Promise<AuthSession | null> {
    console.log('🔐 AuthServiceServer.getSession - Starting (Session Store)');
    
    try {
      let sessionId: string | undefined;

      // Get session ID from single auth-session cookie
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('auth-session');
      sessionId = sessionCookie?.value;
      
      console.log('🔐 Session cookie check:', {
        hasSessionId: !!sessionId,
        cookieValue: sessionId ? 'Session ID present' : 'No session ID',
        allCookies: cookieStore.getAll().map(c => c.name)
      });

      // If no cookie and request provided, check Authorization header
      if (!sessionId && request) {
        const authHeader = request.headers.get('authorization');
        console.log('🔐 Authorization header:', authHeader || 'None');
        if (authHeader?.startsWith('Bearer ')) {
          sessionId = authHeader.substring(7);
          console.log('🔐 Session ID from header extracted');
        }
      }

      if (!sessionId) {
        console.log('🔐 No session ID found in cookies or headers');
        return null;
      }

      console.log('🔐 Attempting to retrieve session from store');
      // Get session from store
      const session = await SessionManager.validateSession(sessionId);
      
      if (!session) {
        console.log('🔐 Session not found or expired in store');
        return null;
      }
      
      console.log('🔐 Session retrieved successfully', {
        userId: session.currentUser.userId,
        userType: session.currentUser.userType,
        isImpersonating: !!session.impersonation?.isActive
      });
      
      // Convert to AuthSession for backward compatibility
      return sessionStateToAuthSession(session);
      
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  static async createSession(
    user: any, 
    request?: NextRequest
  ): Promise<string> {
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined;
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    return await SessionManager.createSession(user, ipAddress, userAgent);
  }

  static async requireAuth(
    request?: NextRequest,
    requiredUserType?: string
  ): Promise<AuthSession> {
    const session = await this.getSession(request);
    
    if (!session) {
      throw new Error('Unauthorized');
    }

    if (requiredUserType && session.userType !== requiredUserType) {
      throw new Error('Forbidden');
    }

    return session;
  }

  static async requireInternalUser(request?: NextRequest): Promise<AuthSession> {
    return this.requireAuth(request, 'internal');
  }

  static async getUserById(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user;
  }
  
  // Get the raw session state (for impersonation)
  static async getSessionState(request?: NextRequest): Promise<SessionState | null> {
    try {
      let sessionId: string | undefined;

      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('auth-session');
      sessionId = sessionCookie?.value;

      if (!sessionId && request) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          sessionId = authHeader.substring(7);
        }
      }

      if (!sessionId) return null;

      return await SessionManager.validateSession(sessionId);
      
    } catch (error) {
      console.error('Failed to get session state:', error);
      return null;
    }
  }
  
  // Clean up old token methods - keeping for backward compatibility but deprecated
  static async createAccountToken(sessionData: AuthSession): Promise<string> {
    console.warn('⚠️ createAccountToken is deprecated - use createSession instead');
    return this.createSession(sessionData);
  }
  
  static async createPublisherToken(sessionData: any): Promise<string> {
    console.warn('⚠️ createPublisherToken is deprecated - use createSession instead');
    return this.createSession(sessionData);
  }
}