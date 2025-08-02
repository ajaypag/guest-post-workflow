import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    
    // Find account with this reset token
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.resetToken, hashedToken)
    });
    
    if (!account) {
      console.log('[RESET] Password reset - token not found');
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Check if token is expired
    if (!account.resetTokenExpiry || new Date() > account.resetTokenExpiry) {
      console.log('[RESET] Password reset - token expired');
      // Clear expired token
      await db.update(accounts)
        .set({
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        })
        .where(eq(accounts.id, account.id));
        
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the account password and clear the reset token
    await db.update(accounts)
      .set({ 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, account.id));

    console.log('[RESET] Password successfully reset for account:', account.email);

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