import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/services/emailService';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { verifyRecaptcha } from '@/lib/utils/recaptcha';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      email, 
      password, 
      name, 
      company, 
      phone, 
      token,
      recaptchaToken,
      requireVerification = false,
      pendingRequest
    } = data;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
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

    // Verify reCAPTCHA if token provided
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        console.warn('🤖 Failed reCAPTCHA verification for:', email);
        return NextResponse.json(
          { error: 'Verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Check if account already exists
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (existingAccount) {
      console.log('🔍 Found existing account:', {
        email: existingAccount.email,
        emailVerified: existingAccount.emailVerified,
        hasToken: !!existingAccount.emailVerificationToken,
        createdAt: existingAccount.createdAt
      });
      
      // Check if this is a recent unverified account (within last 5 minutes)
      // This handles duplicate signup attempts
      if (!existingAccount.emailVerified) {
        const accountAge = Date.now() - new Date(existingAccount.createdAt).getTime();
        const fiveMinutes = 5 * 60 * 1000;
        
        console.log('⏱️ Account age check:', {
          ageMs: accountAge,
          ageMinutes: accountAge / 60000,
          hasToken: !!existingAccount.emailVerificationToken
        });
        
        if (accountAge < fiveMinutes && existingAccount.emailVerificationToken) {
          console.log('🔄 Reusing existing verification token for recent signup:', email);
          
          // Don't create a new account, just resend the verification email with existing token
          try {
            const baseUrl = process.env.NEXTAUTH_URL || 
              (request.headers.get('x-forwarded-proto') || 'https') + '://' + 
              request.headers.get('host');
            const verificationUrl = `${baseUrl}/verify-email?token=${existingAccount.emailVerificationToken}`;
            
            // Check if we should send the email (rate limit per email)
            const lastEmailSent = existingAccount.updatedAt ? 
              Date.now() - new Date(existingAccount.updatedAt).getTime() : fiveMinutes;
            
            if (lastEmailSent >= 60000) { // Only send if last email was more than 1 minute ago
              await EmailService.sendSignupEmailVerification({
                email,
                name,
                verificationUrl,
              });
              
              // Update the timestamp to track when we last sent an email
              await db.update(accounts)
                .set({ updatedAt: new Date() })
                .where(eq(accounts.id, existingAccount.id));
                
              console.log('📧 Verification email resent to:', email);
            } else {
              console.log('⏳ Skipping email send - too recent (wait 1 minute):', email);
            }
          } catch (emailError) {
            console.error('Failed to resend verification email:', emailError);
          }
          
          return NextResponse.json({
            success: true,
            message: requireVerification 
              ? 'Account created. Please check your email to verify your account.'
              : 'Account created successfully',
            requiresVerification: requireVerification,
            hasOrdersLinked: false,
          });
        }
      }
      
      // Otherwise, account truly exists and is either verified or too old
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create account
    const accountId = uuidv4();
    const now = new Date();
    const emailVerificationToken = requireVerification ? uuidv4() : null;

    // Prepare onboarding steps with pending request if provided
    const onboardingData: any = {};
    if (pendingRequest) {
      onboardingData.pendingRequest = pendingRequest;
    }

    await db.insert(accounts).values({
      id: accountId,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactName: name,
      companyName: company || '',
      phone: phone || null,
      status: requireVerification ? 'pending' : 'active',
      emailVerified: !requireVerification,
      emailVerificationToken,
      onboardingSteps: JSON.stringify(onboardingData),
      createdAt: now,
      updatedAt: now,
    });

    // If coming from order share token, handle order approval
    if (token) {
      const order = await OrderService.getOrderByShareToken(token);
      if (order && order.status === 'pending_approval') {
        // Update order with account ID
        await db.update(orders)
          .set({
            accountId: accountId,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        // Account now has access to the order through accountId

        // Approve the order
        await OrderService.updateOrderStatus(
          order.id,
          'approved',
          accountId,
          'Approved during account creation'
        );

        // Invalidate the share token
        await OrderService.invalidateShareToken(order.id);
      }
    }

    // Link any existing orders by email
    // NOTE: This functionality has been removed as we no longer store email in the orders table
    // Orders must be explicitly linked through the share token flow or by admin assignment
    const existingOrders: any[] = [];

    // Send appropriate email
    try {
      if (requireVerification) {
        // Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || 
          (request.headers.get('x-forwarded-proto') || 'https') + '://' + 
          request.headers.get('host');
        const verificationUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`;
        
        await EmailService.sendSignupEmailVerification({
          email,
          name,
          verificationUrl,
        });
        console.log('📧 Verification email sent to:', email);
      } else {
        // Send welcome email for non-verification signups
        await EmailService.sendAccountWelcome({
          email,
          name,
          company: company || undefined,
        });
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail registration if email fails
    }

    // Create session and set cookie (only if not requiring verification)
    if (!requireVerification) {
      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
      });

      if (accountData) {
        // Create user object from account for session
        const user = {
          id: accountData.id,
          email: accountData.email,
          name: accountData.contactName,
          role: 'account' as const,
          isActive: true,
          userType: 'account' as const,
          passwordHash: accountData.password,
          lastLogin: accountData.lastLoginAt,
          createdAt: accountData.createdAt,
          updatedAt: accountData.updatedAt,
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

        console.log('🔐 Account signup successful, cookie set for:', email);
      }
    }

    return NextResponse.json({
      success: true,
      message: requireVerification 
        ? 'Account created. Please check your email to verify your account.'
        : 'Account created successfully',
      requiresVerification: requireVerification,
      hasOrdersLinked: existingOrders.length > 0,
    });
  } catch (error) {
    console.error('Account signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}