import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { authRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitKey = `publisher-forgot-password:${clientIp}`;
    const { allowed, retryAfter } = authRateLimiter.check(rateLimitKey);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Too many password reset attempts. Please try again later.',
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
    
    const { email } = await request.json();
    
    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Find publisher by email
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.email, email.toLowerCase())
    });
    
    // Always return success to prevent email enumeration
    // But only send email if publisher exists
    if (publisher) {
      // Generate reset token
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry
      
      // Update publisher with reset token
      await db.update(publishers)
        .set({
          resetToken,
          resetTokenExpiry,
          updatedAt: new Date()
        })
        .where(eq(publishers.id, publisher.id));
      
      // TODO: Send password reset email
      // await sendPublisherPasswordResetEmail(email, resetToken);
    }
    
    return NextResponse.json({
      success: true,
      message: 'If a publisher account with that email exists, a password reset link has been sent.'
    });
    
  } catch (error) {
    console.error('Publisher forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}