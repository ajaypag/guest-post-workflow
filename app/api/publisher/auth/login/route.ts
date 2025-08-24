import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find publisher by email
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, email.toLowerCase()),
    });

    if (!publisher) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if publisher has a password (shadow publishers don't)
    if (!publisher.password) {
      return NextResponse.json(
        { error: 'Account not activated. Please check your email for claim instructions.' },
        { status: 401 }
      );
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, publisher.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!publisher.emailVerified) {
      return NextResponse.json(
        { 
          error: 'Please verify your email address before signing in.',
          emailVerified: false,
          email: publisher.email
        },
        { status: 403 }
      );
    }

    // Check if account is active
    if (publisher.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // Create session token
    const token = await AuthServiceServer.createPublisherToken({
      userId: publisher.id,
      email: publisher.email,
      name: publisher.contactName,
      role: 'user',
      userType: 'publisher',
      publisherId: publisher.id,
      status: publisher.status,
      companyName: publisher.companyName || undefined,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token-publisher', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Update last login
    await db
      .update(publishers)
      .set({ lastLoginAt: new Date() })
      .where(eq(publishers.id, publisher.id));

    return NextResponse.json({
      success: true,
      user: {
        id: publisher.id,
        email: publisher.email,
        name: publisher.contactName,
        companyName: publisher.companyName,
        userType: 'publisher',
      },
    });
  } catch (error) {
    console.error('Publisher login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}