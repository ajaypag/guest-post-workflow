import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only account users can access this endpoint
    if (session.userType !== 'account') {
      return NextResponse.json({ error: 'Forbidden - Account access only' }, { status: 403 });
    }

    // Get all clients that belong to this account
    if (!session.accountId) {
      return NextResponse.json({ error: 'Account ID not found in session' }, { status: 400 });
    }

    // Fetch all clients where accountId matches the session's accountId
    const accountClients = await db.query.clients.findMany({
      where: eq(clients.accountId, session.accountId),
      with: {
        targetPages: true,
      },
    });

    return NextResponse.json({ 
      clients: accountClients,
      totalBrands: accountClients.length 
    });
  } catch (error) {
    console.error('Error fetching account clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}