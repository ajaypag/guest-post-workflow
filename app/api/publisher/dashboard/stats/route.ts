import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings, publisherPerformance } from '@/lib/db/publisherSchemaActual';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    const publisherId = session.publisherId;

    // Get total websites
    const websiteCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.publisherId, publisherId),
          eq(publisherOfferingRelationships.isActive, true)
        )
      );

    // Get active offerings (direct relationship via publisher_id)
    const activeOfferings = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publisherOfferings)
      .where(
        and(
          eq(publisherOfferings.publisherId, publisherId),
          eq(publisherOfferings.isActive, true)
        )
      );

    // Get performance metrics
    const performance = await db
      .select()
      .from(publisherPerformance)
      .where(eq(publisherPerformance.publisherId, publisherId))
      .limit(1);

    return NextResponse.json({
      totalWebsites: websiteCount[0]?.count || 0,
      activeOfferings: activeOfferings[0]?.count || 0,
      monthlyEarnings: 0, // Would calculate from actual orders
      avgResponseTime: performance[0]?.avgResponseTimeHours || 0,
      reliabilityScore: performance[0]?.reliabilityScore ? parseFloat(performance[0].reliabilityScore) : 0,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}