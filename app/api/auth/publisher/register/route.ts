import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthServiceServer } from '@/lib/auth-server';
import { authRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitKey = `publisher-register:${clientIp}`;
    const { allowed, retryAfter } = authRateLimiter.check(rateLimitKey);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
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
    
    const { email, password, contactName, companyName, phone } = await request.json();
    
    // Validate required input
    if (!email || !password || !contactName) {
      return NextResponse.json(
        { error: 'Email, password, and contact name are required' },
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
    
    // Check if publisher already exists
    const existingPublisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, email.toLowerCase())
    });
    
    if (existingPublisher) {
      return NextResponse.json(
        { error: 'A publisher account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate email verification token
    const emailVerificationToken = uuidv4();
    
    // Create publisher account
    const publisherId = uuidv4();
    const newPublisher = {
      id: publisherId,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactName,
      companyName: companyName || null,
      phone: phone || null,
      status: 'pending', // Requires email verification
      emailVerified: false,
      emailVerificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(publishers).values(newPublisher);
    
    // Send verification email
    try {
      const { EmailService } = await import('@/lib/services/emailService');
      await EmailService.send('notification', {
        to: email.toLowerCase(),
        subject: 'Verify Your Publisher Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Our Publisher Platform!</h2>
            <p>Hello ${contactName},</p>
            <p>Thank you for signing up as a publisher. Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/verify?token=${emailVerificationToken}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/verify?token=${emailVerificationToken}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The Publisher Platform Team
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend later
    }
    
    return NextResponse.json({
      success: true,
      message: 'Publisher account created successfully. Please check your email to verify your account.',
      user: {
        id: publisherId,
        email: email.toLowerCase(),
        name: contactName,
        companyName,
        userType: 'publisher',
        status: 'pending'
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Publisher registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create publisher account' },
      { status: 500 }
    );
  }
}