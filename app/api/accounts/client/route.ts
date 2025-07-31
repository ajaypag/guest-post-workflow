import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.userId),
    });

    if (!account || !account.primaryClientId) {
      return NextResponse.json({ client: null });
    }

    // Get associated client with target pages
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, account.primaryClientId),
      with: {
        targetPages: true,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error fetching account client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}