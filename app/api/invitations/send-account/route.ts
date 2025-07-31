import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { AuthServiceServer } from '@/lib/auth-server';
import { EmailService } from '@/lib/services/emailService';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal admin users can send invitations
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const data = await request.json();
    const { email, clientId, companyName, contactName } = data;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email already has a pending invitation
    const existingInvitation = await db.query.invitations.findFirst({
      where: (inv, { eq, and, isNull }) => 
        and(
          eq(inv.email, email.toLowerCase()),
          eq(inv.targetTable, 'accounts'),
          isNull(inv.usedAt),
          isNull(inv.revokedAt)
        )
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return NextResponse.json({ 
        error: 'An active invitation already exists for this email' 
      }, { status: 400 });
    }

    // Check if account already exists
    const { accounts } = await import('@/lib/db/accountSchema');
    const { eq } = await import('drizzle-orm');
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase())
    });

    if (existingAccount) {
      return NextResponse.json({ 
        error: 'An account already exists with this email' 
      }, { status: 400 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    // Create invitation
    const [invitation] = await db.insert(invitations).values({
      id: uuidv4(),
      email: email.toLowerCase(),
      targetTable: 'accounts',
      role: 'customer', // Default role for account users
      token,
      expiresAt,
      createdByEmail: session.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Build invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/register/account?token=${token}`;

    // Send invitation email
    try {
      await EmailService.sendAccountInvitation(email, {
        inviteUrl,
        expiresIn: '7 days',
        companyName: companyName || undefined,
        contactName: contactName || undefined,
        invitedBy: session.name || session.email
      });
    } catch (emailError) {
      // Rollback invitation if email fails
      await db.delete(invitations).where(eq(invitations.id, invitation.id));
      console.error('Failed to send invitation email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send invitation email' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    console.error('Error creating account invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}