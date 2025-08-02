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

    // For account users, session.userId IS their account ID (from accounts table)
    const accountId = session.userId;

    // Get all clients linked to this account via accountId
    const accountClients = await db.query.clients.findMany({
      where: eq(clients.accountId, accountId),
      with: {
        targetPages: true,
      },
    });

    return NextResponse.json({ clients: accountClients });
  } catch (error) {
    console.error('Error fetching account clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}