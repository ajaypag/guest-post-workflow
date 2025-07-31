import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { EmailService } from '@/lib/services/emailService';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const accountId = params.id;

    // Get account details
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Update account with hashed reset token
    await db
      .update(accounts)
      .set({
        resetToken: hashedToken,
        resetTokenExpiry,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, accountId));

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/account/reset-password?token=${resetToken}`;
    
    await EmailService.sendPasswordResetEmail({
      to: account.email,
      contactName: account.contactName,
      resetUrl,
      expiresIn: '1 hour'
    });

    // Log admin action
    console.log(`[ADMIN ACTION] Password reset initiated for account ${accountId} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('[API] Error resetting account password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}