import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq, isNotNull } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, rawToken } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find account by email
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase())
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get current token info
    const tokenInfo = {
      email: account.email,
      hasResetToken: !!account.resetToken,
      resetTokenLength: account.resetToken?.length,
      resetTokenFirst20: account.resetToken?.substring(0, 20),
      resetTokenExpiry: account.resetTokenExpiry,
      isExpired: account.resetTokenExpiry ? new Date() > account.resetTokenExpiry : null,
      expiryInMinutes: account.resetTokenExpiry 
        ? Math.round((account.resetTokenExpiry.getTime() - Date.now()) / 1000 / 60)
        : null
    };

    // If raw token provided, check if it matches
    let tokenMatch = null;
    if (rawToken) {
      const hashedProvidedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      tokenMatch = {
        providedRawToken: rawToken,
        providedRawTokenLength: rawToken.length,
        hashedProvidedToken: hashedProvidedToken,
        hashedProvidedTokenFirst20: hashedProvidedToken.substring(0, 20),
        matches: account.resetToken === hashedProvidedToken
      };
    }

    // Get all accounts with reset tokens (for debugging)
    const accountsWithTokens = await db.query.accounts.findMany({
      where: isNotNull(accounts.resetToken)
    });

    const tokensInfo = accountsWithTokens.map(acc => ({
      email: acc.email,
      tokenFirst20: acc.resetToken?.substring(0, 20),
      expiry: acc.resetTokenExpiry,
      isExpired: acc.resetTokenExpiry ? new Date() > acc.resetTokenExpiry : null
    }));

    return NextResponse.json({
      accountInfo: tokenInfo,
      tokenMatch,
      totalAccountsWithTokens: tokensInfo.length,
      allTokens: tokensInfo
    });

  } catch (error: any) {
    console.error('[DEBUG RESET TOKEN] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to debug reset token'
    }, { status: 500 });
  }
}