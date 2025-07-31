import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, isNull } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const clientId = params.id;
    
    // Get archive reason from request body
    const body = await request.json();
    const { reason } = body;

    // Check if client exists and is not already archived
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.archivedAt) {
      return NextResponse.json({ error: 'Client is already archived' }, { status: 400 });
    }

    // Check authorization based on user type
    if (session.userType === 'account') {
      // Account users can only archive their own clients
      // Check if this client belongs to the account
      const hasAccess = client.accountId === session.userId;
      
      if (!hasAccess) {
        // Also check if account has this as primary client (legacy support)
        const account = await db.query.accounts.findFirst({
          where: eq(accounts.id, session.userId),
        });
        
        if (!account || account.primaryClientId !== clientId) {
          return NextResponse.json({ error: 'Unauthorized - You can only archive your own clients' }, { status: 403 });
        }
      }
    } else if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Archive the client
    const [archivedClient] = await db
      .update(clients)
      .set({
        archivedAt: new Date(),
        archivedBy: session.userId,
        archiveReason: reason || 'No reason provided',
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    console.log(`[ARCHIVE] Client ${clientId} archived by ${session.email}`);

    return NextResponse.json({
      success: true,
      client: archivedClient
    });

  } catch (error) {
    console.error('[API] Error archiving client:', error);
    return NextResponse.json(
      { error: 'Failed to archive client' },
      { status: 500 }
    );
  }
}

// Restore archived client
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const clientId = params.id;

    // Check if client exists and is archived
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.archivedAt) {
      return NextResponse.json({ error: 'Client is not archived' }, { status: 400 });
    }

    // Check authorization based on user type
    if (session.userType === 'account') {
      // Account users can only restore their own clients
      // Check if this client belongs to the account
      const hasAccess = client.accountId === session.userId;
      
      if (!hasAccess) {
        // Also check if account has this as primary client (legacy support)
        const account = await db.query.accounts.findFirst({
          where: eq(accounts.id, session.userId),
        });
        
        if (!account || account.primaryClientId !== clientId) {
          return NextResponse.json({ error: 'Unauthorized - You can only restore your own clients' }, { status: 403 });
        }
      }
    } else if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    // Restore the client
    const [restoredClient] = await db
      .update(clients)
      .set({
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    console.log(`[RESTORE] Client ${clientId} restored by ${session.email}`);

    return NextResponse.json({
      success: true,
      client: restoredClient
    });

  } catch (error) {
    console.error('[API] Error restoring client:', error);
    return NextResponse.json(
      { error: 'Failed to restore client' },
      { status: 500 }
    );
  }
}