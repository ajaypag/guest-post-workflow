import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      );
    }

    console.log('[RESET VALIDATE] Raw token received:', token);
    console.log('[RESET VALIDATE] Token length:', token.length);

    // Hash the token to look it up
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log('[RESET VALIDATE] Hashed token:', hashedToken);
    
    // Find account with this reset token
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.resetToken, hashedToken)
    });
    
    if (!account) {
      console.log('[RESET VALIDATE] Token not found in database');
      console.log('[RESET VALIDATE] Looking for hashed token:', hashedToken);
      
      // Let's check what tokens exist in the database
      const allAccounts = await db.query.accounts.findMany();
      
      const accountsWithTokens = allAccounts.filter(acc => acc.resetToken !== null);
      console.log('[RESET VALIDATE] Total accounts:', allAccounts.length);
      console.log('[RESET VALIDATE] Accounts with reset tokens:', accountsWithTokens.length);
      
      accountsWithTokens.forEach(acc => {
        if (acc.resetToken) {
          console.log('[RESET VALIDATE] Account email:', acc.email);
          console.log('[RESET VALIDATE] Token in DB:', acc.resetToken.substring(0, 20) + '...');
          console.log('[RESET VALIDATE] Token expiry:', acc.resetTokenExpiry);
          console.log('[RESET VALIDATE] Token matches:', acc.resetToken === hashedToken);
        }
      });
      
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