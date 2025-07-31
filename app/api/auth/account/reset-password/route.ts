import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { resetTokens } from '../forgot-password/route';

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

    // Hash the token to look it up
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Check if token exists and is not expired
    const resetToken = resetTokens.get(hashedToken);
    
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      // Remove expired token
      resetTokens.delete(hashedToken);
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the account password
    await db.update(accounts)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, resetToken.accountId));

    // Delete the used token
    resetTokens.delete(hashedToken);

    return NextResponse.json({
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}