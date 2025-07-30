import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'advertiser') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get advertiser details
    const advertiser = await db.query.advertisers.findFirst({
      where: eq(advertisers.id, session.userId),
    });

    if (!advertiser || !advertiser.primaryClientId) {
      return NextResponse.json({ client: null });
    }

    // Get associated client with target pages
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, advertiser.primaryClientId),
      with: {
        targetPages: true,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error fetching advertiser client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}