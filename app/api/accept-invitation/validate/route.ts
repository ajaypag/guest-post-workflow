import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitation = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        userType: invitations.userType,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdByEmail: invitations.createdByEmail,
        usedAt: invitations.usedAt,
        revokedAt: invitations.revokedAt,
      })
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    const inv = invitation[0];

    // Check if invitation was already used
    if (inv.usedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Check if invitation was revoked
    if (inv.revokedAt) {
      return NextResponse.json(
        { error: 'This invitation has been revoked' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    if (new Date(inv.expiresAt) < now) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Return valid invitation data
    return NextResponse.json({ invitation: inv });
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}