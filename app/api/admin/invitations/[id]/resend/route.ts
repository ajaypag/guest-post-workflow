import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { EmailService } from '@/lib/services/emailService';
import { InvitationEmail } from '@/lib/email/templates';

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

    // Send resent invitation email
    const invitationUrl = `${process.env.NEXTAUTH_URL}/accept-invitation?token=${newToken}`;
    const expiresAtFormatted = newExpiresAt.toISOString();
    
    const emailResult = await EmailService.sendWithTemplate(
      'invitation',
      invitation.email,
      {
        subject: `Reminder: You're invited to join PostFlow`,
        template: InvitationEmail({
          inviteeEmail: invitation.email,
          userType: invitation.userType as 'internal' | 'advertiser' | 'publisher',
          role: invitation.role as 'user' | 'admin',
          invitationUrl,
          expiresAt: expiresAtFormatted,
          invitedBy: 'System Administrator', // TODO: Get from actual session
        }),
      }
    );

    if (!emailResult.success) {
      console.error('Failed to resend invitation email:', emailResult.error);
      // Don't fail the resend operation, just log the error
    } else {
      console.log(`Invitation email resent successfully to ${invitation.email}`);
    }

    return NextResponse.json({ 
      invitation: updatedInvitation[0],
      message: emailResult.success 
        ? 'Invitation resent and email sent successfully'
        : 'Invitation resent but email failed to send'
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}