import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/services/emailService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { signupRateLimiter, signupEmailRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';
import { validateEmailQuality } from '@/lib/utils/emailValidation';
import { verifyRecaptcha } from '@/lib/utils/recaptcha';
import { trackSignupAttempt } from '@/lib/utils/signupTracking';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIp = getClientIp(request);
    const ipRateLimit = signupRateLimiter.check(clientIp);
    
    if (!ipRateLimit.allowed) {
      trackSignupAttempt({
        email: 'unknown',
        ip: clientIp,
        timestamp: new Date(),
        blocked: true,
        reason: 'Rate limit exceeded (IP)'
      });
      return NextResponse.json(
        { 
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: ipRateLimit.retryAfter 
        },
        { status: 429 }
      );
    }
    
    const data = await request.json();
    const { email, password, contactName, companyName, phone, recaptchaToken } = data;
    
    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        console.warn('🤖 Failed reCAPTCHA verification:', { email, ip: clientIp });
        trackSignupAttempt({
          email: email.toLowerCase(),
          ip: clientIp,
          timestamp: new Date(),
          blocked: true,
          reason: 'Failed reCAPTCHA verification'
        });
        return NextResponse.json(
          { error: 'Verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!email || !password || !contactName) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    // Validate email quality (format, disposable, suspicious)
    const emailValidation = validateEmailQuality(email);
    if (!emailValidation.valid) {
      trackSignupAttempt({
        email: email.toLowerCase(),
        ip: clientIp,
        timestamp: new Date(),
        blocked: true,
        reason: emailValidation.reason
      });
      return NextResponse.json(
        { error: emailValidation.reason },
        { status: 400 }
      );
    }
    
    // Rate limiting by email
    const emailRateLimit = signupEmailRateLimiter.check(email.toLowerCase());
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'An account was recently created with this email. Please try again later.',
          retryAfter: emailRateLimit.retryAfter 
        },
        { status: 429 }
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

    // Honeypot check (if honeypot field is filled, it's likely a bot)
    if (data.website || data.url || data.company_website) {
      // Log potential bot attempt
      console.warn('🤖 Potential bot signup blocked:', { email, ip: clientIp });
      trackSignupAttempt({
        email: email.toLowerCase(),
        ip: clientIp,
        timestamp: new Date(),
        blocked: true,
        reason: 'Honeypot field filled (bot detected)'
      });
      // Return success to confuse bots but don't create account
      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        accountId: uuidv4()
      });
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

    // Generate email verification token
    const verificationToken = uuidv4();

    // Create account with onboarding tracking
    const accountId = uuidv4();
    const now = new Date();

    const [newAccount] = await db.insert(accounts).values({
      id: accountId,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactName: contactName.trim(),
      companyName: companyName?.trim() || email.split('@')[1] || 'Company',
      phone: phone || null,
      role: 'viewer', // Default role for self-signup
      status: 'pending', // Pending until email verified
      emailVerified: false, // Require email verification
      emailVerificationToken: verificationToken,
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

    // Send verification email
    try {
      // Get the base URL from environment or request headers
      const baseUrl = process.env.NEXTAUTH_URL || 
        (request.headers.get('x-forwarded-proto') || 'https') + '://' + 
        request.headers.get('host');
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      await EmailService.sendEmailVerification({
        email: newAccount.email,
        name: newAccount.contactName,
        verificationUrl,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
    }

    // Don't create session for unverified users
    // They need to verify their email first

    console.log('✅ Account created successfully:', email);
    
    // Track successful signup
    trackSignupAttempt({
      email: email.toLowerCase(),
      ip: clientIp,
      timestamp: new Date(),
      blocked: false
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      accountId: accountId,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Account signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}