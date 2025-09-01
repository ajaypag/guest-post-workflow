import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch websites with pricing information - only the fields we need
    const websitesList = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        pricingStrategy: websites.pricingStrategy,
      })
      .from(websites)
      .where(sql`${websites.guestPostCost} IS NOT NULL`)
      .orderBy(websites.domain)
      .limit(1000); // Reasonable limit

    return NextResponse.json({
      websites: websitesList,
      total: websitesList.length
    });

  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}