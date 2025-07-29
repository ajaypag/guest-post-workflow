import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const invitationId = params.id;

    // Get existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (existingInvitation.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const invitation = existingInvitation[0];

    // Check if invitation was already used
    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Cannot resend invitation that has already been accepted' },
        { status: 400 }
      );
    }

    // Check if invitation was revoked
    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: 'Cannot resend revoked invitation' },
        { status: 400 }
      );
    }

    // Generate new token and extend expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation with new token and expiration
    const updatedInvitation = await db
      .update(invitations)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    // TODO: Send email invitation here
    console.log(`Invitation resent for ${invitation.email} with new token: ${newToken}`);
    console.log(`New invitation URL: ${process.env.NEXTAUTH_URL}/accept-invitation?token=${newToken}`);

    return NextResponse.json({ 
      invitation: updatedInvitation[0],
      message: 'Invitation resent successfully'
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}