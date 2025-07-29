import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { UserService } from '@/lib/db/userService';
import { EmailService } from '@/lib/services/emailService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await UserService.getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If a user with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing tokens for this user
    await db.execute(sql`
      DELETE FROM password_reset_tokens 
      WHERE user_id = ${user.id} AND (used_at IS NULL)
    `);

    // Create new token
    await db.execute(sql`
      INSERT INTO password_reset_tokens (
        id, user_id, token, expires_at, created_at
      ) VALUES (
        ${uuidv4()},
        ${user.id},
        ${hashedToken},
        ${expiresAt},
        CURRENT_TIMESTAMP
      )
    `);

    // Create reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    await EmailService.send('password-reset', {
      to: user.email,
      subject: 'Reset Your PostFlow Password',
      text: `
Hello ${user.name},

You requested to reset your password for PostFlow.

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
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password for PostFlow.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
      <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
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
      message: 'If a user with that email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}