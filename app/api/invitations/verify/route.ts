import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        type ? eq(invitations.targetTable, type) : undefined,
        isNull(invitations.usedAt),
        isNull(invitations.revokedAt)
      )
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // For account invitations, fetch additional metadata if stored
    let metadata = {};
    if (invitation.targetTable === 'accounts') {
      // You could store additional data in a metadata field if needed
      // For now, we'll just return the basic info
      metadata = {
        companyName: null,
        contactName: null
      };
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        targetTable: invitation.targetTable,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        ...metadata
      }
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}