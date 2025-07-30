import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { db } from './db/connection';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  userType: string; // 'internal' | 'advertiser' | 'publisher'
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export class AuthServiceServer {
  static async getSession(request?: NextRequest): Promise<AuthSession | null> {
    console.log('🔐 AuthServiceServer.getSession - Starting');
    
    try {
      let token: string | undefined;

      // Try to get token from cookies first
      const cookieStore = await cookies();
      const authTokenCookie = cookieStore.get('auth-token');
      token = authTokenCookie?.value;
      
      console.log('🔐 Cookie check:', {
        hasAuthToken: !!token,
        cookieValue: token ? 'Token present' : 'No token',
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
        role: payload.role as string,
        userType: payload.userType as string || 'internal',
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
}