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
      
      // Send password reset email
      try {
        const { EmailService } = await import('@/lib/services/emailService');
        await EmailService.send('notification', {
          to: email.toLowerCase(),
          subject: 'Reset Your Publisher Account Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Password Reset Request</h2>
              <p>Hello ${publisher.contactName || 'Publisher'},</p>
              <p>We received a request to reset your publisher account password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/reset-password?token=${resetToken}" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/reset-password?token=${resetToken}</p>
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request a password reset, please ignore this email. Your password won't be changed.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                For security reasons, we never ask for your password via email.<br>
                Best regards,<br>
                The Publisher Platform Team
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue anyway - user can request another reset
      }
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