import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { EmailService } from '@/lib/services/emailService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { passwordResetRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitKey = `account-reset:${clientIp}`;
    const { allowed, retryAfter } = passwordResetRateLimiter.check(rateLimitKey);
    
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

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find account by email
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase())
    });
    
    // Always return success to prevent email enumeration
    if (!account) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if account is active
    if (account.status !== 'active') {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    console.log('[FORGOT PASSWORD] Generated raw token:', token);
    console.log('[FORGOT PASSWORD] Generated hashed token:', hashedToken);
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await db.update(accounts)
      .set({
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, account.id));
      
    console.log('[FORGOT PASSWORD] Stored token for account:', account.email);
    console.log('[FORGOT PASSWORD] Token expiry:', expiresAt);

    // Create reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/account/reset-password?token=${token}`;

    // Send email
    await EmailService.send('password-reset', {
      to: account.email,
      subject: 'Reset Your PostFlow Account Password',
      text: `
Hello ${account.contactName || account.companyName},

You requested to reset your password for your PostFlow account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
The PostFlow Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello ${account.contactName || account.companyName},</p>
      <p>You requested to reset your password for your PostFlow account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
      <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The PostFlow Team</p>
      <p>&copy; 2025 PostFlow by OutreachLabs. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `
    });

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    console.error('Account forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}

