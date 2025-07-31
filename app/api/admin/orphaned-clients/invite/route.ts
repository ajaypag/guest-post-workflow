import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { InvitationService } from '@/lib/services/invitationService';
import { EmailService } from '@/lib/services/emailService';
import { AuthServiceServer } from '@/lib/auth-server';
import { inArray, sql } from 'drizzle-orm';
import crypto from 'crypto';

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

    // Create invitation
    const invitation = await InvitationService.createInvitation({
      email,
      targetTable: 'accounts',
      role: 'admin',
      createdByEmail: session.email
    });

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

    await EmailService.sendAccountInvitation({
      to: email,
      inviterName: session.name || session.email,
      inviteUrl,
      brandName: emailBody
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