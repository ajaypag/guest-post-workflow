import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PublisherDashboard from '@/components/publisher/PublisherDashboard';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings, publisherPerformance } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { orderItems } from '@/lib/db/orderSchema';
import { websites } from '@/lib/db/websiteSchema';
import { PublisherOrder } from '@/lib/types/publisher';

async function getPublisherStats(publisherId: string) {
  // Initialize default values
  let totalWebsites = 0;
  let activeOfferings = 0;
  let monthlyEarnings = 0;
  let avgResponseTime = 0;
  let reliabilityScore = 0;
  let topWebsites: any[] = [];
  const recentOrders: PublisherOrder[] = [];

  try {
    // Get total websites managed by this publisher
    const websiteCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.publisherId, publisherId),
          eq(publisherOfferingRelationships.isActive, true)
        )
      );
    totalWebsites = websiteCount[0]?.count || 0;
  } catch (error) {
    console.error('❌ Website count query failed:', error);
  }

  try {
    // Get active offerings for this publisher
    const offeringsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(publisherOfferings)
      .where(
        and(
          eq(publisherOfferings.publisherId, publisherId),
          eq(publisherOfferings.isActive, true)
        )
      );
    activeOfferings = offeringsCount[0]?.count || 0;
  } catch (error) {
    console.error('❌ Offerings count query failed:', error);
  }
  
  try {
    // Get performance metrics
    const performance = await db
      .select()
      .from(publisherPerformance)
      .where(eq(publisherPerformance.publisherId, publisherId))
      .limit(1);
    
    if (performance[0]) {
      monthlyEarnings = performance[0].revenueGenerated || 0;
      avgResponseTime = Number(performance[0].avgResponseTimeHours || 0);
      reliabilityScore = performance[0].reliabilityScore ? parseFloat(performance[0].reliabilityScore) : 0;
    }
  } catch (error) {
    console.error('❌ Performance query failed:', error);
  }
  
  try {
    // Get top performing websites
    topWebsites = await db
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
      .orderBy(desc(sql`COALESCE(${publisherPerformance.revenueGenerated}, 0)`))
      .limit(5);
  } catch (error) {
    console.error('❌ Top websites query failed:', error);
    topWebsites = [];
  }
    
  return {
    totalWebsites,
    activeOfferings,
    monthlyEarnings,
    avgResponseTime,
    reliabilityScore,
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