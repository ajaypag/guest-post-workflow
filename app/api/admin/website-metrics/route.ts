import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    // Fetch all websites with their metrics
    const result = await db
      .select({
        domain: websites.domain,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
        status: websites.status,
        source: websites.source,
        updatedAt: websites.updatedAt
      })
      .from(websites)
      .orderBy(websites.domain);

    return NextResponse.json({ 
      websites: result,
      total: result.length 
    });

  } catch (error) {
    console.error('Error fetching website metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website metrics' },
      { status: 500 }
    );
  }
}