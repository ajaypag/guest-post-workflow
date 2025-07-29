import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
        { error: 'Cannot revoke invitation that has already been accepted' },
        { status: 400 }
      );
    }

    // Check if invitation was already revoked
    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: 'Invitation is already revoked' },
        { status: 400 }
      );
    }

    // Revoke invitation
    const revokedInvitation = await db
      .update(invitations)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    console.log(`Invitation revoked for ${invitation.email}`);

    return NextResponse.json({ 
      invitation: revokedInvitation[0],
      message: 'Invitation revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}