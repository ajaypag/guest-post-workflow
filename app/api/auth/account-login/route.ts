import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
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

    // Find account by email
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (account.status !== 'active' && account.status !== 'pending') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(accounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(accounts.id, account.id));

    // Create JWT token with account info
    const token = await new SignJWT({
      userId: account.id,
      email: account.email,
      userType: 'account',
      role: 'account',
      name: account.contactName,
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

    // Return account data (excluding password)
    const { password: _, ...accountData } = account;
    
    return NextResponse.json({
      success: true,
      user: {
        ...accountData,
        name: account.contactName,
        userType: 'account',
        role: 'account',
      },
    });
  } catch (error) {
    console.error('Account login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}