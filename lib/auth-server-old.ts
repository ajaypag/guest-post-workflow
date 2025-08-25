import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { db } from './db/connection';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { AuthSession, UserType, UserRole } from './types/auth';

// Re-export for backward compatibility
export type { AuthSession };

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
);

export class AuthServiceServer {
  static async getSession(request?: NextRequest): Promise<AuthSession | null> {
    console.log('🔐 AuthServiceServer.getSession - Starting');
    
    try {
      let token: string | undefined;

      // Try to get token from cookies first
      const cookieStore = await cookies();
      
      // Check for tokens in priority order: publisher, account, internal user
      const publisherTokenCookie = cookieStore.get('auth-token-publisher');
      const accountTokenCookie = cookieStore.get('auth-token-account');
      const authTokenCookie = cookieStore.get('auth-token');
      token = publisherTokenCookie?.value || accountTokenCookie?.value || authTokenCookie?.value;
      
      console.log('🔐 Cookie check:', {
        hasAuthToken: !!token,
        cookieValue: token ? 'Token present' : 'No token',
        publisherTokenCookie: publisherTokenCookie?.name,
        accountTokenCookie: accountTokenCookie?.name,
        authTokenCookie: authTokenCookie?.name,
        allCookies: cookieStore.getAll().map(c => c.name)
      });

      // If no cookie and request provided, check Authorization header
      if (!token && request) {
        const authHeader = request.headers.get('authorization');
        console.log('🔐 Authorization header:', authHeader || 'None');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          console.log('🔐 Token from header extracted');
        }
      }

      if (!token) {
        console.log('🔐 No token found in cookies or headers');
        return null;
      }

      console.log('🔐 Attempting to verify JWT token');
      // Verify JWT token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as UserRole,
        userType: (payload.userType as UserType) || 'internal',
        accountId: payload.accountId as string | undefined,
        clientId: payload.clientId as string | null | undefined,
        companyName: payload.companyName as string | undefined,
        publisherId: payload.publisherId as string | undefined,
        status: payload.status as string | undefined,
      };
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  static async createSession(user: any): Promise<string> {
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType || 'internal',
      accountId: user.accountId || undefined,
      clientId: user.clientId || undefined,
      companyName: user.companyName || undefined,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return token;
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
  
  static async createAccountToken(sessionData: AuthSession): Promise<string> {
    const token = await new SignJWT({
      ...sessionData,
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    
    return token;
  }
  
  static async createPublisherToken(sessionData: any): Promise<string> {
    const token = await new SignJWT({
      ...sessionData,
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    
    return token;
  }
}