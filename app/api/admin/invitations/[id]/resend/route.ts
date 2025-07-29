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

    console.log('[InvitationResendAPI] === Starting invitation resend ===');
    console.log('[InvitationResendAPI] Invitation ID:', invitationId);

    // Get existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (existingInvitation.length === 0) {
      console.log('[InvitationResendAPI] Invitation not found');
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const invitation = existingInvitation[0];
    console.log('[InvitationResendAPI] Found invitation:', {
      id: invitation.id,
      email: invitation.email,
      userType: invitation.userType,
      role: invitation.role,
      usedAt: invitation.usedAt,
      revokedAt: invitation.revokedAt,
      expiresAt: invitation.expiresAt
    });

    // Check if invitation was already used
    if (invitation.usedAt) {
      console.log('[InvitationResendAPI] Cannot resend - invitation already accepted');
      return NextResponse.json(
        { error: 'Cannot resend invitation that has already been accepted' },
        { status: 400 }
      );
    }

    // Check if invitation was revoked
    if (invitation.revokedAt) {
      console.log('[InvitationResendAPI] Cannot resend - invitation was revoked');
      return NextResponse.json(
        { error: 'Cannot resend revoked invitation' },
        { status: 400 }
      );
    }

    console.log('[InvitationResendAPI] Generating new token and expiration...');

    // Generate new token and extend expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    console.log('[InvitationResendAPI] New token length:', newToken.length, 'New expiration:', newExpiresAt.toISOString());

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

    console.log('[InvitationResendAPI] Invitation updated with new token');

    // Send resent invitation email
    // Fallback to a default URL if NEXTAUTH_URL is not set
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/accept-invitation?token=${newToken}`;
    const expiresAtFormatted = newExpiresAt.toISOString();
    
    console.log('[InvitationResendAPI] Preparing to send resend email with:', {
      recipient: invitation.email,
      invitationUrl,
      emailServiceExists: !!EmailService,
      nextAuthUrl: process.env.NEXTAUTH_URL
    });
    
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

    console.log('[InvitationResendAPI] Email resend result:', {
      success: emailResult.success,
      id: emailResult.id,
      error: emailResult.error
    });

    if (!emailResult.success) {
      console.error('[InvitationResendAPI] Failed to resend invitation email:', emailResult.error);
      // Don't fail the resend operation, just log the error
    } else {
      console.log(`[InvitationResendAPI] Invitation email resent successfully to ${invitation.email} with ID: ${emailResult.id}`);
    }

    const responseMessage = emailResult.success 
      ? 'Invitation resent and email sent successfully'
      : 'Invitation resent but email failed to send';

    console.log('[InvitationResendAPI] === Invitation resend completed ===');
    console.log('[InvitationResendAPI] Final result:', responseMessage);

    return NextResponse.json({ 
      invitation: updatedInvitation[0],
      message: responseMessage,
      emailSent: emailResult.success,
      emailId: emailResult.id
    });
  } catch (error) {
    console.error('[InvitationResendAPI] === ERROR in invitation resend ===');
    console.error('[InvitationResendAPI] Error details:', error);
    console.error('[InvitationResendAPI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to resend invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}