import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { ClientService } from '@/lib/db/clientService';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all clients/brands for this account
    const accountClients = await ClientService.getClientsByAccount(session.userId);
    
    // Also check for legacy primaryClientId
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.userId),
    });
    
    if (account && account.primaryClientId) {
      // Check if primary client is already in the list
      const hasPrimary = accountClients.some(c => c.id === account.primaryClientId);
      if (!hasPrimary) {
        const primaryClient = await db.query.clients.findFirst({
          where: eq(clients.id, account.primaryClientId),
          with: {
            targetPages: true,
          },
        });
        if (primaryClient) {
          accountClients.push(primaryClient as any);
        }
      }
    }

    return NextResponse.json({ 
      clients: accountClients,
      totalBrands: accountClients.length 
    });
  } catch (error) {
    console.error('Error fetching account clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}