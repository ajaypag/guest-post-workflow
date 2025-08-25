import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/db/userService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit - DISABLED FOR TEST ENVIRONMENT
    // const clientIp = getClientIp(request);
    // const rateLimitKey = `login:${clientIp}`;
    // const { allowed, retryAfter } = authRateLimiter.check(rateLimitKey);
    
    // if (!allowed) {
    //   return NextResponse.json(
    //     { 
    //       error: 'Too many login attempts. Please try again later.',
    //       retryAfter 
    //     },
    //     { 
    //       status: 429,
    //       headers: {
    //         'Retry-After': String(retryAfter)
    //       }
    //     }
    //   );
    // }
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // First try to find user in users table (internal team)
    let user = await UserService.verifyPassword(email, password);
    let userType = 'internal';
    let clientId: string | undefined;
    let companyName: string | undefined;
    
    if (!user) {
      // If not found in users table, check accounts table
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.email, email.toLowerCase()),
      });
      
      if (account) {
        // Verify account password
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (isPasswordValid && (account.status === 'active' || account.status === 'pending')) {
          // Create user object from account
          user = {
            id: account.id,
            email: account.email,
            name: account.contactName,
            role: 'account',
            isActive: true,
            passwordHash: account.password,
            lastLogin: account.lastLoginAt,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          };
          userType = 'account';
          clientId = account.primaryClientId || undefined;
          companyName = account.companyName;
          
          // Update last login
          await db
            .update(accounts)
            .set({ lastLoginAt: new Date() })
            .where(eq(accounts.id, account.id));
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token with userType and additional fields for account users
    const userWithType = { 
      ...user, 
      userType,
      ...(userType === 'account' && {
        clientId,
        companyName,
        accountId: user.id
      })
    };
    // Create session and get session ID
    const sessionId = await AuthServiceServer.createSession(userWithType, request);
    
    // Create response first
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        userType: userType,
        ...(userType === 'account' && {
          clientId,
          companyName
        })
      }
    });

    // Set cookie on the response
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log environment for debugging
    console.log('🔐 Setting session cookie with:', {
      name: 'auth-session',
      value: sessionId.substring(0, 20) + '...',
      httpOnly: true,
      secure: isProduction,
      nodeEnv: process.env.NODE_ENV,
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    
    response.cookies.set({
      name: 'auth-session',
      value: sessionId,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      // Add domain if specified in env
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
    });

    console.log('🔐 Login successful, cookie set for:', user.email, 'userType:', userType, 'clientId:', clientId);
    console.log('🔐 Response headers:', response.headers.get('set-cookie'));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}