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
    const { email, userType, role } = await request.json();

    if (!email || !userType || !role) {
      return NextResponse.json(
        { error: 'Email, user type, and role are required' },
        { status: 400 }
      );
    }

    // Validate userType and role
    if (!['internal', 'advertiser', 'publisher'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if invitation already exists and is pending
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email))
      .limit(1);

    if (existingInvitation.length > 0) {
      const inv = existingInvitation[0];
      const now = new Date();
      
      // If invitation exists and is still pending/valid, return error
      if (!inv.usedAt && !inv.revokedAt && new Date(inv.expiresAt) > now) {
        return NextResponse.json(
          { error: 'Active invitation already exists for this email' },
          { status: 400 }
        );
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

    // Send invitation email
    const invitationUrl = `${process.env.NEXTAUTH_URL}/accept-invitation?token=${token}`;
    const expiresAtFormatted = expiresAt.toISOString();
    
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

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the invitation creation, just log the error
    } else {
      console.log(`Invitation email sent successfully to ${email}`);
    }

    return NextResponse.json({ 
      invitation: newInvitation[0],
      message: emailResult.success 
        ? 'Invitation created and email sent successfully'
        : 'Invitation created but email failed to send'
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}