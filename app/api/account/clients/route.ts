import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
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
      return NextResponse.json({ error: 'Forbidden - Account access only' }, { status: 403 });
    }

    // Get account with primary client using accountId from session
    if (!session.accountId) {
      return NextResponse.json({ error: 'Account ID not found in session' }, { status: 400 });
    }

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.accountId),
      with: {
        primaryClient: {
          with: {
            targetPages: true,
          },
        },
      },
    });

    // Return primary client as array for compatibility
    const clientsData = account?.primaryClient ? [account.primaryClient] : [];

    return NextResponse.json({ clients: clientsData });
  } catch (error) {
    console.error('Error fetching account clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}