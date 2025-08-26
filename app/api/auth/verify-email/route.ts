import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

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

    // Check for pending vetted sites request in onboardingSteps
    let requestCreated = false;
    let createdRequestId = null;
    
    if (account.onboardingSteps) {
      try {
        const onboardingData = typeof account.onboardingSteps === 'string' 
          ? JSON.parse(account.onboardingSteps) 
          : account.onboardingSteps;
        
        if (onboardingData.pendingRequest) {
          // Create the vetted sites request
          const requestId = uuidv4();
          const request = {
            id: requestId,
            accountId: account.id,
            targetUrls: onboardingData.pendingRequest.targetUrls || [],
            filters: onboardingData.pendingRequest.filters || {},
            notes: onboardingData.pendingRequest.notes || 'Request created via homepage lead magnet',
            status: 'submitted' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await db.insert(vettedSitesRequests).values(request);
          
          requestCreated = true;
          createdRequestId = requestId;
          
          // Clear the pending request from onboardingSteps
          delete onboardingData.pendingRequest;
          onboardingData.requestCreated = true;
          await db.update(accounts)
            .set({
              onboardingSteps: JSON.stringify(onboardingData),
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, account.id));
          
          console.log('✅ Created vetted sites request after verification:', requestId);
        }
      } catch (err) {
        console.error('Error processing pending request:', err);
      }
    }

    // Create session for auto-login after verification
    // Match the pattern from login route - need 'id' field, not 'userId'
    const sessionData = {
      id: account.id,  // This is what SessionManager expects
      accountId: account.id,  // Also include accountId for account users
      email: account.email,
      name: account.contactName || account.companyName || 'Account User',
      role: (account.role || 'viewer') as 'viewer' | 'editor' | 'admin',
      userType: 'account' as const,
      clientId: account.primaryClientId || undefined,
      companyName: account.companyName || undefined
    };
    
    // Use the proper createSession method instead of deprecated createAccountToken
    const sessionId = await AuthServiceServer.createSession(sessionData, request);

    console.log('✅ Email verified successfully:', account.email);

    // Create response with success data
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      alreadyVerified: false,
      requestCreated,
      requestId: createdRequestId
    });

    // Set session cookie on the response
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: 'auth-session',
      value: sessionId,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
    });

    return response;

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