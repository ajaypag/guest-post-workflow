import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthServiceServer } from '@/lib/auth-server';
import { authRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitKey = `account-login:${clientIp}`;
    const { allowed, retryAfter } = authRateLimiter.check(rateLimitKey);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter)
          }
        }
      );
    }
    
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find account by email
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
      with: {
        primaryClient: true
      }
    });
    
    if (!account) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (account.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact support.' },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.password || '');
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create session data
    const sessionData = {
      userId: account.id,
      accountId: account.id,
      email: account.email,
      name: account.contactName || account.companyName || 'Account User',
      role: (account.role || 'viewer') as any, // Use role from database
      userType: 'account' as const,
      clientId: account.primaryClientId,
      companyName: account.companyName
    };
    
    // Create JWT token
    const token = await AuthServiceServer.createAccountToken(sessionData);
    
    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: account.id,
        email: account.email,
        name: account.contactName || account.companyName,
        companyName: account.companyName,
        userType: 'account',
        clientId: account.primaryClientId
      },
      // Token is stored in HTTP-only cookie, not returned to client
    });
    
    // Set auth cookie
    response.cookies.set({
      name: 'auth-token-account',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Update last login
    await db.update(accounts)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(accounts.id, account.id));
    
    return response;
    
  } catch (error) {
    console.error('Account login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}