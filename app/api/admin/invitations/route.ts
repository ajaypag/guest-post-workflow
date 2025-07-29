import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sessionStorage } from '@/lib/userStorage';
import { EmailService } from '@/lib/services/emailService';
import { InvitationEmail } from '@/lib/email/templates';

// Get all invitations
export async function GET() {
  try {
    // Check admin auth (simplified for API route)
    // In a real app, you'd verify the session properly
    
    const allInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        userType: invitations.userType,
        role: invitations.role,
        token: invitations.token,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        usedAt: invitations.usedAt,
        revokedAt: invitations.revokedAt,
        createdByEmail: invitations.createdByEmail,
      })
      .from(invitations)
      .orderBy(desc(invitations.createdAt));

    // Add status to each invitation
    const now = new Date();
    const invitationsWithStatus = allInvitations.map(inv => ({
      ...inv,
      status: inv.revokedAt 
        ? 'revoked'
        : inv.usedAt 
        ? 'accepted'
        : new Date(inv.expiresAt) < now
        ? 'expired'
        : 'pending'
    }));

    return NextResponse.json({ invitations: invitationsWithStatus });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// Create new invitation  
export async function POST(request: NextRequest) {
  try {
    console.log('[InvitationAPI] === Starting invitation creation ===');
    const { email, userType, role } = await request.json();
    console.log('[InvitationAPI] Request data:', { email, userType, role });

    if (!email || !userType || !role) {
      console.log('[InvitationAPI] Missing required fields');
      return NextResponse.json(
        { error: 'Email, user type, and role are required' },
        { status: 400 }
      );
    }

    // Validate userType and role
    if (!['internal', 'advertiser', 'publisher'].includes(userType)) {
      console.log('[InvitationAPI] Invalid user type:', userType);
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (!['user', 'admin'].includes(role)) {
      console.log('[InvitationAPI] Invalid role:', role);
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    console.log('[InvitationAPI] Validation passed, checking for existing user...');

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('[InvitationAPI] User already exists with email:', email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    console.log('[InvitationAPI] No existing user found, checking for pending invitations...');

    // Check if invitation already exists and is pending
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email))
      .limit(1);

    if (existingInvitation.length > 0) {
      const inv = existingInvitation[0];
      const now = new Date();
      
      console.log('[InvitationAPI] Found existing invitation:', {
        id: inv.id,
        email: inv.email,
        usedAt: inv.usedAt,
        revokedAt: inv.revokedAt,
        expiresAt: inv.expiresAt,
        isExpired: new Date(inv.expiresAt) < now
      });
      
      // If invitation exists and is still pending/valid, return error
      if (!inv.usedAt && !inv.revokedAt && new Date(inv.expiresAt) > now) {
        console.log('[InvitationAPI] Active invitation already exists');
        return NextResponse.json(
          { error: 'Active invitation already exists for this email' },
          { status: 400 }
        );
      }
    }

    console.log('[InvitationAPI] Generating invitation token and creating record...');

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('[InvitationAPI] Generated token length:', token.length, 'Expires at:', expiresAt.toISOString());

    // Create invitation record
    const newInvitation = await db
      .insert(invitations)
      .values({
        id: crypto.randomUUID(),
        email,
        userType,
        role,
        token,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByEmail: 'admin@system.com', // TODO: Get from actual session
      })
      .returning();

    console.log('[InvitationAPI] Invitation record created:', {
      id: newInvitation[0].id,
      email: newInvitation[0].email,
      userType: newInvitation[0].userType,
      role: newInvitation[0].role
    });

    // Send invitation email
    // Fallback to a default URL if NEXTAUTH_URL is not set
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;
    const expiresAtFormatted = expiresAt.toISOString();
    
    console.log('[InvitationAPI] Preparing to send email with:', {
      recipient: email,
      invitationUrl,
      emailServiceExists: !!EmailService,
      nextAuthUrl: process.env.NEXTAUTH_URL
    });
    
    const emailResult = await EmailService.sendWithTemplate(
      'invitation',
      email,
      {
        subject: `You're invited to join PostFlow`,
        template: InvitationEmail({
          inviteeEmail: email,
          userType: userType as 'internal' | 'advertiser' | 'publisher',
          role: role as 'user' | 'admin',
          invitationUrl,
          expiresAt: expiresAtFormatted,
          invitedBy: 'System Administrator', // TODO: Get from actual session
        }),
      }
    );

    console.log('[InvitationAPI] Email send result:', {
      success: emailResult.success,
      id: emailResult.id,
      error: emailResult.error
    });

    if (!emailResult.success) {
      console.error('[InvitationAPI] Failed to send invitation email:', emailResult.error);
      // Don't fail the invitation creation, just log the error
    } else {
      console.log(`[InvitationAPI] Invitation email sent successfully to ${email} with ID: ${emailResult.id}`);
    }

    const responseMessage = emailResult.success 
      ? 'Invitation created and email sent successfully'
      : 'Invitation created but email failed to send';

    console.log('[InvitationAPI] === Invitation creation completed ===');
    console.log('[InvitationAPI] Final result:', responseMessage);

    return NextResponse.json({ 
      invitation: newInvitation[0],
      message: responseMessage,
      emailSent: emailResult.success,
      emailId: emailResult.id
    });
  } catch (error) {
    console.error('[InvitationAPI] === ERROR in invitation creation ===');
    console.error('[InvitationAPI] Error details:', error);
    console.error('[InvitationAPI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to create invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}