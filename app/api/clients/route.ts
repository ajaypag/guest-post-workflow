import { NextRequest, NextResponse } from 'next/server';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Diagnostic tracking for infinite loop detection
let getCallCount = 0;
const getCallLog: { timestamp: number; sessionType?: string }[] = [];

export async function GET(request: NextRequest) {
  // Diagnostic logging
  getCallCount++;
  const now = Date.now();
  console.log(`[CLIENTS API] GET call #${getCallCount} at ${new Date().toISOString()}`);
  
  try {
    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    console.log(`[CLIENTS API] Session type: ${session?.userType}`);
    
    getCallLog.push({
      timestamp: now,
      sessionType: session?.userType
    });
    
    // Calculate recent call rate
    const recentCalls = getCallLog.filter(log => now - log.timestamp < 5000); // Last 5 seconds
    if (recentCalls.length > 10) {
      console.error(`[CLIENTS API] ⚠️ INFINITE LOOP DETECTED: ${recentCalls.length} calls in last 5 seconds!`);
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    let clients;
    
    // Check access based on user type
    if (session.userType === 'internal') {
      // Internal users: Full access to all clients
      if (userId) {
        clients = await ClientService.getUserClients(userId);
      } else {
        clients = await ClientService.getAllClients(includeArchived);
      }
    } else if (session.userType === 'account') {
      // Account users: Only access their own clients
      clients = await ClientService.getClientsByAccount(session.userId, includeArchived);
      
      // Also check if account has a primary client (legacy support)
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.userId),
      });
      
      if (account && account.primaryClientId) {
        const primaryClient = await ClientService.getClient(account.primaryClientId);
        if (primaryClient && !clients.find(c => c.id === primaryClient.id)) {
          // Only include if not archived (unless includeArchived is true)
          if (includeArchived || !primaryClient.archivedAt) {
            clients.push(primaryClient);
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
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
    
    // Check permissions based on user type
    if (session.userType === 'internal') {
      // Internal users: Can create clients with any configuration
    } else if (session.userType === 'account') {
      // Account users: Can only create clients for themselves
      if (creationPath !== 'existing_account') {
        return NextResponse.json({ 
          error: 'Forbidden - Account users can only create brands for their own account' 
        }, { status: 403 });
      }
      
      // Force the accountId to be their own
      if (accountId && accountId !== session.userId) {
        return NextResponse.json({ 
          error: 'Forbidden - Cannot create brands for other accounts' 
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    // Add created_by from session
    // For account users, we need to use a system user ID since accounts are not in the users table
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'; // system@internal.postflow user
    
    const clientData: any = {
      ...clientInfo,
      createdBy: session.userType === 'account' ? SYSTEM_USER_ID : session.userId
    };
    
    // Handle path-specific data
    let invitationSent = false;
    let shareToken = null;
    
    if (creationPath === 'existing_account') {
      // Link to existing account
      if (!accountId) {
        return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
      }
      
      // For account users, ensure it's their own account
      if (session.userType === 'account') {
        clientData.accountId = session.userId;
      } else {
        clientData.accountId = accountId;
      }
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
        const { invitations } = await import('@/lib/db/schema');
        const { v4: uuidv4 } = await import('uuid');
        const { isNull, and } = await import('drizzle-orm');
        
        // Check if email already has a pending invitation
        const existingInvitation = await db.query.invitations.findFirst({
          where: and(
            eq(invitations.email, invitationEmail.toLowerCase()),
            eq(invitations.targetTable, 'accounts'),
            isNull(invitations.usedAt),
            isNull(invitations.revokedAt)
          )
        });

        if (existingInvitation && existingInvitation.expiresAt > new Date()) {
          // Use existing invitation
          var invitation = existingInvitation;
        } else {
          // Generate secure token
          const token = (await import('crypto')).randomBytes(32).toString('base64url');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

          // Create invitation
          const [newInvitation] = await db.insert(invitations).values({
            id: uuidv4(),
            email: invitationEmail.toLowerCase(),
            targetTable: 'accounts',
            role: 'admin',
            token,
            expiresAt,
            createdByEmail: session.email,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          var invitation = newInvitation;
        }
        
        // Update client with invitation ID
        await db.update(clients)
          .set({ invitationId: invitation.id })
          .where(eq(clients.id, client.id));
        
        // Send invitation email
        const { EmailService } = await import('@/lib/services/emailService');
        const inviteUrl = `${process.env.NEXTAUTH_URL || request.headers.get('origin')}/register/account?token=${invitation.token}`;
        
        await EmailService.sendAccountInvitation(invitationEmail, {
          inviteUrl,
          expiresIn: '7 days',
          companyName: client.name,
          invitedBy: session.name || session.email
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
        const result = await ClientService.addTargetPages(client.id, urls);
        console.log(`Target pages added to new client: ${result.added} added, ${result.duplicates} duplicates skipped`);
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