import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PublisherDashboard from '@/components/publisher/PublisherDashboard';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings, publisherPerformance } from '@/lib/db/publisherOfferingsSchemaFixed';
import { eq, and, desc, sql } from 'drizzle-orm';
import { orderItems } from '@/lib/db/orderSchema';
import { websites } from '@/lib/db/websiteSchema';
import { PublisherOrder } from '@/lib/types/publisher';

async function getPublisherStats(publisherId: string) {
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

  // Get active offerings
  const activeOfferings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(publisherOfferings)
    .innerJoin(
      publisherOfferingRelationships,
      eq(publisherOfferings.publisherRelationshipId, publisherOfferingRelationships.id)
    )
    .where(
      and(
        eq(publisherOfferingRelationships.publisherId, publisherId),
        eq(publisherOfferings.isActive, true)
      )
    );

  // Get performance metrics
  const performance = await db
    .select()
    .from(publisherPerformance)
    .where(eq(publisherPerformance.publisherId, publisherId))
    .limit(1);

  // Get recent orders (placeholder - would need to link through websites)
  // For now, we'll return mock data
  const recentOrders: PublisherOrder[] = [];

  // Get top performing websites
  const topWebsites = await db
    .select({
      website: websites,
      relationship: publisherOfferingRelationships,
      performance: publisherPerformance
    })
    .from(publisherOfferingRelationships)
    .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
    .leftJoin(
      publisherPerformance,
      and(
        eq(publisherPerformance.publisherId, publisherId),
        eq(publisherPerformance.websiteId, websites.id)
      )
    )
    .where(
      and(
        eq(publisherOfferingRelationships.publisherId, publisherId),
        eq(publisherOfferingRelationships.isActive, true)
      )
    )
    .orderBy(desc(publisherPerformance.totalRevenue))
    .limit(5);

  return {
    totalWebsites: websiteCount[0]?.count || 0,
    activeOfferings: activeOfferings[0]?.count || 0,
    monthlyEarnings: 0, // Would calculate from actual orders
    avgResponseTime: Number(performance[0]?.avgResponseTimeHours || 0),
    reliabilityScore: performance[0]?.reliabilityScore ? parseFloat(performance[0].reliabilityScore) : 0,
    recentOrders,
    topWebsites,
  };
}

export default async function PublisherDashboardPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  // Validate publisher ID exists
  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  const stats = await getPublisherStats(session.publisherId);

  return <PublisherDashboard stats={stats} />;
}