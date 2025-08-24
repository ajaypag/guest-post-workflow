import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthServiceServer } from '@/lib/auth-server';
import { authRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitKey = `publisher-login:${clientIp}`;
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
    
    let email: string, password: string;
    try {
      const text = await request.text();
      console.log('Received body:', text);
      const body = JSON.parse(text);
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find publisher by email
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, email.toLowerCase())
    });
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if publisher account is active
    if (publisher.status !== 'active') {
      return NextResponse.json(
        { error: 'Publisher account is not active. Please contact support.' },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, publisher.password || '');
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create session data for publisher
    const sessionData = {
      id: publisher.id,
      userId: publisher.id,
      publisherId: publisher.id,
      email: publisher.email,
      name: publisher.contactName || publisher.companyName || 'Publisher User',
      role: 'publisher' as any,
      userType: 'publisher' as const,
      companyName: publisher.companyName,
      status: publisher.status,
      isActive: publisher.status === 'active'
    };
    
    // Create session using the session manager
    const sessionId = await AuthServiceServer.createSession(sessionData, request);
    
    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: publisher.id,
        email: publisher.email,
        name: publisher.contactName || publisher.companyName,
        companyName: publisher.companyName,
        userType: 'publisher',
        status: publisher.status
      }
    });
    
    // Set auth-session cookie (same as other user types)
    response.cookies.set({
      name: 'auth-session',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Update last login
    await db.update(publishers)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(publishers.id, publisher.id));
    
    return response;
    
  } catch (error) {
    console.error('Publisher login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}