import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find advertiser by email
    const advertiser = await db.query.advertisers.findFirst({
      where: eq(advertisers.email, email.toLowerCase()),
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (advertiser.status !== 'active' && advertiser.status !== 'pending') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, advertiser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(advertisers)
      .set({ lastLoginAt: new Date() })
      .where(eq(advertisers.id, advertiser.id));

    // Create JWT token with advertiser info
    const token = await new SignJWT({
      userId: advertiser.id,
      email: advertiser.email,
      userType: 'advertiser',
      role: 'advertiser',
      name: advertiser.contactName,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Return advertiser data (excluding password)
    const { password: _, ...advertiserData } = advertiser;
    
    return NextResponse.json({
      success: true,
      user: {
        ...advertiserData,
        name: advertiser.contactName,
        userType: 'advertiser',
        role: 'advertiser',
      },
    });
  } catch (error) {
    console.error('Advertiser login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}