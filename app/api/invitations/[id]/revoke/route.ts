import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { AuthServiceServer } from '@/lib/auth-server';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only internal admin users can revoke invitations
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const { id: invitationId } = await params;

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.id, invitationId),
        isNull(invitations.usedAt),
        isNull(invitations.revokedAt)
      )
    });

    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or already used/revoked' 
      }, { status: 404 });
    }

    // Revoke the invitation
    await db.update(invitations)
      .set({ 
        revokedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(invitations.id, invitationId));

    return NextResponse.json({
      success: true,
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