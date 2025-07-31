import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { AuthServiceServer } from '@/lib/auth-server';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal users can view invitations
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Build query conditions
    const conditions = [];
    if (type) {
      conditions.push(eq(invitations.targetTable, type));
    }

    // Fetch invitations
    const invitationsList = await db.query.invitations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(invitations.createdAt)]
    });

    // Transform the data to include status
    const transformedInvitations = invitationsList.map(inv => {
      let status: 'pending' | 'used' | 'expired' | 'revoked' = 'pending';
      
      if (inv.usedAt) {
        status = 'used';
      } else if (inv.revokedAt) {
        status = 'revoked';
      } else if (inv.expiresAt < new Date()) {
        status = 'expired';
      }

      return {
        ...inv,
        status
      };
    });

    return NextResponse.json({
      invitations: transformedInvitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}