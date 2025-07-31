import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let clients;
    
    // If account, only return their associated client
    if (session.userType === 'account') {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.userId),
      });
      
      if (!account || !account.primaryClientId) {
        return NextResponse.json({ clients: [] });
      }
      
      const client = await ClientService.getClient(account.primaryClientId);
      clients = client ? [client] : [];
    } else {
      // Internal users can see all clients
      if (userId) {
        clients = await ClientService.getUserClients(userId);
      } else {
        clients = await ClientService.getAllClients();
      }
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/clients - Starting request');
  
  try {
    // Log request headers for debugging
    console.log('🔍 Request headers:', {
      cookie: request.headers.get('cookie'),
      authorization: request.headers.get('authorization'),
      contentType: request.headers.get('content-type'),
    });
    
    const session = await AuthServiceServer.getSession(request);
    console.log('🔍 Session result:', session ? 'Session found' : 'No session');
    
    // Additional debugging for production
    console.log('🔍 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      APP_URL: request.headers.get('host'),
      REFERER: request.headers.get('referer'),
      ORIGIN: request.headers.get('origin'),
    });
    
    if (!session) {
      console.log('❌ No session found - returning 401');
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.email);
    const data = await request.json();
    console.log('🔍 Request data:', { ...data, targetPages: data.targetPages?.length + ' pages' });
    
    // Extract creation path and related data
    const { creationPath, accountId, invitationEmail, ...clientInfo } = data;
    
    // Add created_by from session
    const clientData: any = {
      ...clientInfo,
      createdBy: session.userId
    };
    
    // Handle path-specific data
    let invitationSent = false;
    let shareToken = null;
    
    if (creationPath === 'existing_account') {
      // Link to existing account
      if (!accountId) {
        return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
      }
      clientData.accountId = accountId;
    } else if (creationPath === 'send_invitation') {
      // Will create invitation after client is created
      if (!invitationEmail) {
        return NextResponse.json({ error: 'Invitation email required' }, { status: 400 });
      }
    } else if (creationPath === 'generate_link') {
      // Generate share token
      const crypto = await import('crypto');
      shareToken = crypto.randomBytes(32).toString('base64url');
      clientData.shareToken = shareToken;
    }
    
    const client = await ClientService.createClient(clientData);

    // Handle invitation if needed
    if (creationPath === 'send_invitation' && invitationEmail) {
      try {
        // Import invitation service
        const { InvitationService } = await import('@/lib/services/invitationService');
        
        // Create invitation
        const invitation = await InvitationService.createInvitation({
          email: invitationEmail,
          targetTable: 'accounts',
          role: 'admin',
          createdByEmail: session.email
        });
        
        // Update client with invitation ID
        await db.update(clients)
          .set({ invitationId: invitation.id })
          .where(eq(clients.id, client.id));
        
        // Send invitation email
        const { EmailService } = await import('@/lib/services/emailService');
        const inviteUrl = `${process.env.NEXTAUTH_URL || request.headers.get('origin')}/register/account?token=${invitation.token}`;
        
        await EmailService.sendAccountInvitation({
          to: invitationEmail,
          inviterName: session.name || session.email,
          inviteUrl,
          brandName: client.name
        });
        
        invitationSent = true;
      } catch (error) {
        console.error('Error sending invitation:', error);
        // Don't fail the whole request if invitation fails
      }
    }

    // If assignedUsers is provided, handle assignments
    if (data.assignedUsers && Array.isArray(data.assignedUsers)) {
      for (const userId of data.assignedUsers) {
        await ClientService.assignUserToClient(client.id, userId);
      }
    }

    // Handle target pages
    if (data.targetPages && Array.isArray(data.targetPages)) {
      const urls = data.targetPages.filter((u: string) => u.trim());
      if (urls.length > 0) {
        await ClientService.addTargetPages(client.id, urls);
      }
    }

    return NextResponse.json({ 
      client,
      invitationSent,
      shareToken
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create client' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    
    console.log('🟨 PUT /api/clients - Received data:', { id, updates });
    
    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const client = await ClientService.updateClient(id, updates);
    console.log('🟨 ClientService.updateClient result:', client);
    
    if (!client) {
      console.log('🟨 Client not found for ID:', id);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('🟨 Error updating client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const success = await ClientService.deleteClient(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Client not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete client' },
      { status: 500 }
    );
  }
}