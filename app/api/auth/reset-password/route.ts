import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { UserService } from '@/lib/db/userService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
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

    // Hash the token to match what's stored in database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Start a transaction
    await db.execute(sql`BEGIN`);

    try {
      // Find the valid token
      const tokenResult = await db.execute(sql`
        SELECT 
          prt.id as token_id,
          prt.user_id,
          prt.expires_at,
          prt.used_at,
          u.id,
          u.email,
          u.name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ${hashedToken}
          AND prt.used_at IS NULL
          AND prt.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
        FOR UPDATE
      `);

      if (tokenResult.rows.length === 0) {
        await db.execute(sql`ROLLBACK`);
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      const { token_id, user_id, email } = tokenResult.rows[0];

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user's password
      await db.execute(sql`
        UPDATE users 
        SET 
          password_hash = ${passwordHash},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user_id}
      `);

      // Mark token as used
      await db.execute(sql`
        UPDATE password_reset_tokens 
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = ${token_id}
      `);

      // Commit transaction
      await db.execute(sql`COMMIT`);

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}