import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { UserService } from '@/lib/db/userService';
import { EmailService } from '@/lib/services/emailService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email - check both users table (internal) and accounts table (external)
    let user = await UserService.getUserByEmail(email);
    let userType = 'internal';
    let actualUserId = user?.id; // The real user/account ID
    let tokenUserId = user?.id; // The ID to store in password_reset_tokens (system user for accounts)
    let userName = user?.name;
    let userEmail = user?.email || email;
    
    // If not found in users table, check accounts table
    if (!user) {
      const accountResults = await db.execute(sql`
        SELECT id, email, contact_name as name 
        FROM accounts 
        WHERE email = ${email}
        LIMIT 1
      `);
      
      const accountResult = accountResults.rows?.[0];
      
      if (accountResult) {
        userType = 'account';
        actualUserId = (accountResult as any).id; // Store the actual account ID
        tokenUserId = SYSTEM_USER_ID; // Use system user ID for the token table
        userName = (accountResult as any).name || (accountResult as any).contact_name || 'Customer';
        userEmail = (accountResult as any).email;
        // Create a user-like object for compatibility
        user = {
          id: actualUserId,
          name: userName,
          email: userEmail
        } as any;
      }
    }
    
    // Always return success to prevent email enumeration
    if (!actualUserId || !user) {
      return NextResponse.json({
        message: 'If a user with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // For account users, delete any existing tokens with the actual account ID stored in metadata
    if (userType === 'account') {
      // Clean up old tokens for this account
      await db.execute(sql`
        DELETE FROM password_reset_tokens 
        WHERE metadata->>'account_id' = ${actualUserId} AND (used_at IS NULL)
      `);
    } else {
      // For internal users, delete tokens by user_id
      await db.execute(sql`
        DELETE FROM password_reset_tokens 
        WHERE user_id = ${tokenUserId} AND (used_at IS NULL)
      `);
    }

    // Create new token - use system user ID for accounts, actual user ID for internal users
    // Store the actual account ID in metadata for account users
    const metadata = userType === 'account' 
      ? JSON.stringify({ account_id: actualUserId, user_type: 'account' })
      : JSON.stringify({ user_type: 'internal' });
    
    await db.execute(sql`
      INSERT INTO password_reset_tokens (
        id, user_id, token, expires_at, created_at, metadata
      ) VALUES (
        ${uuidv4()},
        ${tokenUserId},
        ${hashedToken},
        CURRENT_TIMESTAMP + INTERVAL '1 hour',
        CURRENT_TIMESTAMP,
        ${metadata}::jsonb
      )
    `);

    // Create reset URL - include user type for proper handling
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&type=${userType}`;

    // Send email
    await EmailService.send('password-reset', {
      to: userEmail,
      subject: 'Reset Your Linkio Password',
      text: `
Hello ${userName},

You requested to reset your password for Linkio.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
The Linkio Team
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
      <p>Hello ${userName},</p>
      <p>You requested to reset your password for Linkio.</p>
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
      <p>Best regards,<br>The Linkio Team</p>
      <p>&copy; 2025 Linkio. All rights reserved.</p>
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