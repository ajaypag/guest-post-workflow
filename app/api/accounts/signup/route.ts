import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/services/emailService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password, contactName, companyName, phone } = data;

    // Validate required fields
    if (!email || !password || !contactName || !companyName) {
      return NextResponse.json(
        { error: 'All fields except phone are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create account with onboarding tracking
    const accountId = uuidv4();
    const now = new Date();

    const [newAccount] = await db.insert(accounts).values({
      id: accountId,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactName: contactName.trim(),
      companyName: companyName.trim(),
      phone: phone || null,
      role: 'viewer', // Default role for self-signup
      status: 'active',
      emailVerified: true, // Auto-verify for self-signup
      onboardingCompleted: false,
      onboardingSteps: JSON.stringify({
        complete_profile: false,
        add_brand: false,
        create_order: false,
        review_domains: false,
        read_guidelines: false,
        configure_preferences: false
      }),
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Send welcome email with onboarding info
    try {
      await EmailService.sendAccountWelcomeWithOnboarding({
        email: newAccount.email,
        name: newAccount.contactName,
        company: newAccount.companyName || undefined,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Create session and set cookie for auto-login
    const user = {
      id: newAccount.id,
      email: newAccount.email,
      name: newAccount.contactName,
      role: newAccount.role as 'viewer' | 'editor' | 'admin',
      isActive: true,
      userType: 'account' as const,
      passwordHash: newAccount.password,
      lastLogin: newAccount.lastLoginAt,
      createdAt: newAccount.createdAt,
      updatedAt: newAccount.updatedAt,
    };
    
    const token = await AuthServiceServer.createSession(user);
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Update last login
    await db.update(accounts)
      .set({ lastLoginAt: now })
      .where(eq(accounts.id, accountId));

    console.log('✅ Account created successfully:', email);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      accountId: accountId
    });

  } catch (error) {
    console.error('Account signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}