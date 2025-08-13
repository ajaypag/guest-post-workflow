import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find account with this verification token
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.emailVerificationToken, token),
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (account.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    // Verify the email
    await db.update(accounts)
      .set({
        emailVerified: true,
        emailVerificationToken: null, // Clear the token
        status: 'active', // Activate the account
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id));

    // Create session for auto-login after verification
    const sessionData = {
      userId: account.id,
      accountId: account.id,
      email: account.email,
      name: account.contactName || account.companyName || 'Account User',
      role: (account.role || 'viewer') as 'viewer' | 'editor' | 'admin',
      userType: 'account' as const,
      clientId: account.primaryClientId || undefined,
      companyName: account.companyName || undefined
    };
    
    const authToken = await AuthServiceServer.createAccountToken(sessionData);
    
    // Set cookie for auto-login
    const cookieStore = await cookies();
    cookieStore.set('auth-token-account', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log('✅ Email verified successfully:', account.email);

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/verify-email/success', request.url)
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email. Please try again.' },
      { status: 500 }
    );
  }
}

// POST method for resending verification email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (!account) {
      // Don't reveal if account exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent'
      });
    }

    if (account.emailVerified) {
      return NextResponse.json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const { v4: uuidv4 } = await import('uuid');
    const newToken = uuidv4();

    // Update token in database
    await db.update(accounts)
      .set({
        emailVerificationToken: newToken,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id));

    // Send new verification email
    const { EmailService } = await import('@/lib/services/emailService');
    // Get the base URL from environment or request headers
    const baseUrl = process.env.NEXTAUTH_URL || 
      (request.headers.get('x-forwarded-proto') || 'https') + '://' + 
      request.headers.get('host');
    const verificationUrl = `${baseUrl}/verify-email?token=${newToken}`;
    
    await EmailService.sendEmailVerification({
      email: account.email,
      name: account.contactName || 'User',
      verificationUrl,
    });

    console.log('📧 Verification email resent to:', account.email);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}