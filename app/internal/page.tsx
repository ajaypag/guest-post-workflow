import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites, publishers, publisherOfferingRelationships } from '@/lib/db/schema';
import { sql, eq, desc, isNotNull } from 'drizzle-orm';
import InternalDashboard from '@/components/internal/InternalDashboard';

export default async function InternalPortalPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Get statistics
  const [websiteStats, publisherStats, relationshipStats, recentWebsites, recentPublishers] = await Promise.all([
    // Website statistics
    db.select({
      total: sql<number>`count(*)`,
      withPublishers: sql<number>`count(distinct case when exists (
        select 1 from ${publisherOfferingRelationships} por 
        where por.website_id = ${websites.id}
      ) then ${websites.id} end)`,
      highQuality: sql<number>`count(case when ${websites.domainRating} >= 50 then 1 end)`,
      qualityScored: sql<number>`count(case when ${websites.internalQualityScore} is not null then 1 end)`
    }).from(websites),

    // Publisher statistics
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(case when ${publishers.status} = 'active' then 1 end)`,
      verified: sql<number>`count(case when ${publishers.emailVerified} = true then 1 end)`
    }).from(publishers),

    // Relationship statistics
    db.select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(case when ${publisherOfferingRelationships.verificationStatus} = 'verified' then 1 end)`,
      withOfferings: sql<number>`count(distinct case when ${publisherOfferingRelationships.offeringId} is not null then ${publisherOfferingRelationships.id} end)`
    }).from(publisherOfferingRelationships),

    // Recent websites
    db.select({
      id: websites.id,
      domain: websites.domain,
      domainRating: websites.domainRating,
      totalTraffic: websites.totalTraffic,
      createdAt: websites.createdAt
    })
    .from(websites)
    .orderBy(desc(websites.createdAt))
    .limit(5),

    // Recent publishers
    db.select({
      id: publishers.id,
      companyName: publishers.companyName,
      email: publishers.email,
      status: publishers.status,
      createdAt: publishers.createdAt
    })
    .from(publishers)
    .orderBy(desc(publishers.createdAt))
    .limit(5)
  ]);

  return (
    <InternalDashboard
      websiteStats={websiteStats[0]}
      publisherStats={publisherStats[0]}
      relationshipStats={relationshipStats[0]}
      recentWebsites={recentWebsites}
      recentPublishers={recentPublishers}
    />
  );
}