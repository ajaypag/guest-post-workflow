import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    console.log('[InvitationVerify] Request received:', { token, type });

    if (!token) {
      console.log('[InvitationVerify] No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Use direct query instead of db.query which might not be set up
    console.log('[InvitationVerify] Looking for invitation with token:', token);
    
    const invitationResults = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          type ? eq(invitations.targetTable, type) : undefined,
          isNull(invitations.usedAt),
          isNull(invitations.revokedAt)
        )
      );

    console.log('[InvitationVerify] Query results:', {
      found: invitationResults.length,
      results: invitationResults
    });

    if (invitationResults.length === 0) {
      // Let's check what's wrong - find ANY invitation with this token
      const anyInvitation = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token));
      
      console.log('[InvitationVerify] Debug - ANY invitation with token:', {
        found: anyInvitation.length,
        invitation: anyInvitation[0] || null
      });

      if (anyInvitation.length > 0) {
        const inv = anyInvitation[0];
        const reasons = [];
        if (inv.usedAt) reasons.push('already used');
        if (inv.revokedAt) reasons.push('revoked');
        if (inv.targetTable !== type) reasons.push(`wrong type (expected ${type}, got ${inv.targetTable})`);
        
        console.log('[InvitationVerify] Invitation exists but not valid:', reasons.join(', '));
        return NextResponse.json({ 
          error: 'Invalid or expired invitation',
          debug: { reasons, invitation: { ...inv, token: 'REDACTED' } }
        }, { status: 404 });
      }

      console.log('[InvitationVerify] No invitation found with this token');
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    const invitation = invitationResults[0];

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      console.log('[InvitationVerify] Invitation has expired:', {
        expiresAt: invitation.expiresAt,
        now: new Date()
      });
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

    console.log('[InvitationVerify] Valid invitation found, returning success');

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
    console.error('[InvitationVerify] Error:', error);
    console.error('[InvitationVerify] Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Failed to verify invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}