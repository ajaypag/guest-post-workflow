import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    // Reset publisher to shadow status for testing
    await db.update(publishers)
      .set({
        password: null,
        accountStatus: 'shadow',
        status: 'shadow',
        emailVerified: false,
        claimedAt: null,
        invitationToken: '6c1a9c7b-28a5-4a83-ba13-9321b54a6d2c', // Reset token
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        claimAttempts: 0,
        lastClaimAttempt: null,
        lastLoginAt: null,
        updatedAt: new Date(),
      })
      .where(eq(publishers.id, publisherId));
    
    return NextResponse.json({
      success: true,
      message: 'Publisher reset to shadow status for testing',
      publisherId,
      claimUrl: `http://localhost:3002/publisher/claim?token=6c1a9c7b-28a5-4a83-ba13-9321b54a6d2c`
    });
    
  } catch (error) {
    console.error('Failed to reset publisher:', error);
    return NextResponse.json(
      { error: 'Failed to reset publisher' },
      { status: 500 }
    );
  }
}