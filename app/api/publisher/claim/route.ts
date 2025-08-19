import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherClaimHistory } from '@/lib/db/emailProcessingSchema';
import { shadowPublisherConfig } from '@/lib/config/shadowPublisherConfig';
import { eq, and, gte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

// Validation schemas
const initiateClaimSchema = z.object({
  token: z.string().min(1),
});

const completeClaimSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
  confirmPassword: z.string(),
  contactName: z.string().min(1).max(255),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});

// GET - Validate claim token and return publisher info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Claim token is required' },
        { status: 400 }
      );
    }
    
    // Find publisher by invitation token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.invitationToken, token),
          eq(publishers.accountStatus, 'shadow')
        )
      )
      .limit(1);
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Invalid or expired claim token' },
        { status: 404 }
      );
    }
    
    // Check if token has expired
    if (publisher.invitationExpiresAt && new Date() > publisher.invitationExpiresAt) {
      return NextResponse.json(
        { error: 'This claim token has expired' },
        { status: 410 }
      );
    }
    
    // Check if account is locked due to too many attempts
    if ((publisher.claimAttempts || 0) >= shadowPublisherConfig.invitation.claimMaxAttempts) {
      const lockoutTime = publisher.lastClaimAttempt
        ? new Date(publisher.lastClaimAttempt.getTime() + shadowPublisherConfig.invitation.claimLockoutMinutes * 60 * 1000)
        : null;
      
      if (lockoutTime && new Date() < lockoutTime) {
        return NextResponse.json(
          { 
            error: 'Too many claim attempts. Please try again later.',
            retryAfter: lockoutTime.toISOString()
          },
          { status: 429 }
        );
      }
    }
    
    // Return publisher preview info (safe data only)
    return NextResponse.json({
      success: true,
      publisher: {
        email: publisher.email,
        contactName: publisher.contactName || '',
        companyName: publisher.companyName || '',
        source: publisher.source,
        createdAt: publisher.createdAt,
      }
    });
    
  } catch (error) {
    console.error('Failed to validate claim token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Complete the claim process
export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const body = await request.json();
    const validation = completeClaimSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { token, password, confirmPassword, contactName, companyName, phone } = validation.data;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }
    
    // Find publisher by invitation token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.invitationToken, token),
          eq(publishers.accountStatus, 'shadow')
        )
      )
      .limit(1);
    
    if (!publisher) {
      // Log failed attempt
      console.warn('Claim attempt with invalid token:', { token, ipAddress });
      return NextResponse.json(
        { error: 'Invalid or expired claim token' },
        { status: 404 }
      );
    }
    
    // Check if token has expired
    if (publisher.invitationExpiresAt && new Date() > publisher.invitationExpiresAt) {
      // Log expired attempt
      await logClaimAttempt(publisher.id, 'fail_claim', false, 'Token expired', ipAddress, userAgent);
      return NextResponse.json(
        { error: 'This claim token has expired' },
        { status: 410 }
      );
    }
    
    // Check if account is locked
    if ((publisher.claimAttempts || 0) >= shadowPublisherConfig.invitation.claimMaxAttempts) {
      const lockoutTime = publisher.lastClaimAttempt
        ? new Date(publisher.lastClaimAttempt.getTime() + shadowPublisherConfig.invitation.claimLockoutMinutes * 60 * 1000)
        : null;
      
      if (lockoutTime && new Date() < lockoutTime) {
        await logClaimAttempt(publisher.id, 'fail_claim', false, 'Account locked', ipAddress, userAgent);
        return NextResponse.json(
          { 
            error: 'Too many claim attempts. Please try again later.',
            retryAfter: lockoutTime.toISOString()
          },
          { status: 429 }
        );
      }
    }
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Update publisher to active status
      await db.update(publishers)
        .set({
          password: hashedPassword,
          contactName,
          companyName: companyName || publisher.companyName,
          phone: phone || publisher.phone,
          accountStatus: 'active',
          status: 'active',
          emailVerified: true,
          claimedAt: new Date(),
          invitationToken: null, // Clear the token
          invitationExpiresAt: null,
          claimAttempts: 0,
          lastClaimAttempt: null,
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisher.id));
      
      // Log successful claim
      await logClaimAttempt(publisher.id, 'complete_claim', true, null, ipAddress, userAgent);
      
      // TODO: Send welcome email
      // await sendWelcomeEmail(publisher.email, contactName);
      
      return NextResponse.json({
        success: true,
        message: 'Account successfully claimed',
        redirectUrl: '/publisher/dashboard'
      });
      
    } catch (error) {
      // Increment claim attempts
      await db.update(publishers)
        .set({
          claimAttempts: (publisher.claimAttempts || 0) + 1,
          lastClaimAttempt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisher.id));
      
      // Log failed attempt
      await logClaimAttempt(
        publisher.id, 
        'fail_claim', 
        false, 
        error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
        userAgent
      );
      
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to complete claim:', error);
    return NextResponse.json(
      { error: 'Failed to complete claim process' },
      { status: 500 }
    );
  }
}

// Helper function to log claim attempts
async function logClaimAttempt(
  publisherId: string,
  action: string,
  success: boolean,
  failureReason: string | null,
  ipAddress: string,
  userAgent: string
) {
  try {
    await db.insert(publisherClaimHistory).values({
      id: crypto.randomUUID(),
      publisherId,
      action,
      success,
      failureReason,
      ipAddress,
      userAgent,
      verificationMethod: 'token',
      metadata: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log claim attempt:', error);
  }
}