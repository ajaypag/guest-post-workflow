import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only account users can access this endpoint
    if (session.userType !== 'account') {
      return NextResponse.json({ error: 'This debug endpoint is for account users only' }, { status: 403 });
    }

    // For account users, session.userId IS their account ID
    const accountId = session.userType === 'account' ? session.userId : session.accountId;
    
    const diagnostics: any = {
      session,
      timestamp: new Date().toISOString()
    };

    // Get account details
    if (accountId) {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
      });
      
      diagnostics.account = account ? {
        id: account.id,
        email: account.email,
        contactName: account.contactName,
        companyName: account.companyName,
        primaryClientId: account.primaryClientId,
        status: account.status
      } : null;
    }
    
    // Get clients by accountId
    const accountClients = accountId 
      ? await db.query.clients.findMany({
          where: eq(clients.accountId, accountId),
          with: {
            targetPages: true,
          },
        })
      : [];
    
    diagnostics.clientsByAccountId = {
      count: accountClients.length,
      clients: accountClients.map(c => ({
        id: c.id,
        name: c.name,
        website: c.website,
        accountId: c.accountId,
        createdAt: c.createdAt,
        targetPagesCount: c.targetPages?.length || 0
      }))
    };

    // Check what /api/account/clients would return
    diagnostics.accountClientsEndpointWouldReturn = {
      clients: accountClients,
      count: accountClients.length
    };

    // Debug info
    diagnostics.debug = {
      sessionAccountId: session.accountId,
      sessionUserId: session.userId,
      resolvedAccountId: accountId,
      queryUsed: `SELECT * FROM clients WHERE accountId = '${accountId}'`
    };

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run diagnostics', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}