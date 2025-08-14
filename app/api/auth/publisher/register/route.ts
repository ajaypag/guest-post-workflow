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
      status: 'pending', // Requires email verification and admin approval
      emailVerified: false,
      emailVerificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(publishers).values(newPublisher);
    
    // TODO: Send verification email
    // await sendPublisherVerificationEmail(email, emailVerificationToken);
    
    return NextResponse.json({
      success: true,
      message: 'Publisher account created successfully. Please check your email for verification instructions.',
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