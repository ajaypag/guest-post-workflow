import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients, invitations } from '@/lib/db/schema';
import { EmailService } from '@/lib/services/emailService';
import { AuthServiceServer } from '@/lib/auth-server';
import { inArray, sql, eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientIds, email } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'No clients selected' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get client details for the invitation email
    const selectedClients = await db
      .select({
        id: clients.id,
        name: clients.name
      })
      .from(clients)
      .where(inArray(clients.id, clientIds));

    if (selectedClients.length === 0) {
      return NextResponse.json(
        { error: 'No valid clients found' },
        { status: 400 }
      );
    }

    // Check if email already has a pending invitation
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, email.toLowerCase()),
        eq(invitations.targetTable, 'accounts'),
        isNull(invitations.usedAt),
        isNull(invitations.revokedAt)
      )
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return NextResponse.json({ 
        error: 'An active invitation already exists for this email' 
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
      role: 'admin',
      token,
      expiresAt,
      createdByEmail: session.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Create a temporary association token to link these clients after signup
    const associationToken = crypto.randomBytes(32).toString('base64url');
    
    // Store the association in a temporary table or in the invitation metadata
    // For now, we'll update the first client with the invitation ID
    await db
      .update(clients)
      .set({ 
        invitationId: sql`${invitation.id}::uuid`,
        updatedAt: new Date() 
      })
      .where(inArray(clients.id, clientIds));

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL || request.headers.get('origin')}/register/account?token=${invitation.token}&clients=${clientIds.join(',')}`;
    
    const clientNames = selectedClients.map(c => c.name).join(', ');
    const emailBody = clientNames.length > 1 
      ? `manage the following brands: ${clientNames}`
      : `manage ${clientNames}`;

    await EmailService.sendAccountInvitation(email, {
      inviteUrl,
      expiresIn: '7 days',
      companyName: clientNames.length > 1 ? 'Multiple Brands' : clientNames,
      invitedBy: session.name || session.email
    });

    return NextResponse.json({ 
      success: true,
      invitationSent: true,
      message: `Invitation sent to ${email} for ${selectedClients.length} clients`
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}