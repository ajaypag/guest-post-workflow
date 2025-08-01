import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountUserId } = await request.json();
    if (!accountUserId) {
      return NextResponse.json({ error: 'Account user ID required' }, { status: 400 });
    }

    // 1. Get the account record
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountUserId),
    });

    // 2. Get the primary client if it exists
    let primaryClient = null;
    if (account?.primaryClientId) {
      primaryClient = await db.query.clients.findFirst({
        where: eq(clients.id, account.primaryClientId),
        with: {
          targetPages: true,
        },
      });
    }

    // 3. Get all clients with matching accountId
    const clientsByAccountId = await db.query.clients.findMany({
      where: eq(clients.accountId, accountUserId),
      with: {
        targetPages: true,
      },
    });

    // 4. Get a sample of all clients for comparison
    const allClients = await db.query.clients.findMany({
      limit: 5,
    });
    const allClientsCount = await db.select().from(clients);

    // 5. Create a mock session to test endpoints
    const mockAccountSession = {
      userId: accountUserId,
      email: account?.email || 'test@example.com',
      name: account?.contactName || 'Test User',
      role: 'user' as const,
      userType: 'account' as const,
      accountId: accountUserId,
      companyName: account?.companyName,
    };

    // 6. Test the different endpoints
    let internalClientsEndpoint = { error: 'Not tested - requires internal user auth' };
    let accountClientsEndpoint = { error: 'Not tested' };
    let dashboardClientsEndpoint = { error: 'Not tested' };

    // Test /api/account/clients
    try {
      // Since we can't easily mock the request context, we'll just check what the logic would return
      const accountClientsLogic = account?.primaryClient ? [primaryClient] : [];
      accountClientsEndpoint = { clients: accountClientsLogic };
    } catch (err) {
      accountClientsEndpoint = { error: err instanceof Error ? err.message : 'Failed' };
    }

    // Test /api/accounts/client logic
    try {
      // This endpoint uses ClientService.getClientsByAccount(session.userId)
      // But it's using userId instead of accountId, which might be the issue
      dashboardClientsEndpoint = { 
        note: 'This endpoint uses session.userId which might be wrong for account users',
        wouldQuery: `ClientService.getClientsByAccount('${accountUserId}')`,
        expectedResult: clientsByAccountId
      };
    } catch (err) {
      dashboardClientsEndpoint = { error: err instanceof Error ? err.message : 'Failed' };
    }

    // 7. Check what /api/clients would return (internal endpoint)
    const allClientsForInternal = await db.query.clients.findMany({
      with: {
        targetPages: true,
      },
    });
    internalClientsEndpoint = { 
      clients: allClientsForInternal,
      note: 'This returns ALL clients - only for internal users'
    };

    return NextResponse.json({
      account,
      sessionInfo: mockAccountSession,
      primaryClient,
      clientsByAccountId,
      allClientsCount: allClientsCount.length,
      sampleClients: allClients,
      internalClientsEndpoint,
      accountClientsEndpoint,
      dashboardClientsEndpoint,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}