import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
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
      console.log('[RESET] Token not found in database:', hashedToken.substring(0, 10) + '...');
      return NextResponse.json({
        error: 'Invalid or expired reset token',
        valid: false
      }, { status: 400 });
    }
    
    // Check if token is expired
    if (!account.resetTokenExpiry || new Date() > account.resetTokenExpiry) {
      console.log('[RESET] Token expired for account:', account.email);
      // Clear expired token
      await db.update(accounts)
        .set({
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        })
        .where(eq(accounts.id, account.id));
        
      return NextResponse.json({
        error: 'Reset token has expired',
        valid: false
      }, { status: 400 });
    }
    
    console.log('[RESET] Valid token for account:', account.email);
    return NextResponse.json({
      valid: true
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token', valid: false },
      { status: 500 }
    );
  }
}