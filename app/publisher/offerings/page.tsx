import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherOfferingsSchemaFixed';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, sql } from 'drizzle-orm';
import PublisherOfferingsGrid from '@/components/publisher/PublisherOfferingsGrid';

export default async function PublisherOfferingsPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  // Get all offerings for this publisher
  const allOfferings = await db
    .select({
      offering: publisherOfferings,
      relationship: publisherOfferingRelationships,
      website: websites
    })
    .from(publisherOfferings)
    .innerJoin(
      publisherOfferingRelationships,
      eq(publisherOfferings.publisherRelationshipId, publisherOfferingRelationships.id)
    )
    .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
    .where(eq(publisherOfferingRelationships.publisherId, session.publisherId));

  // Get statistics
  const stats = {
    total: allOfferings.length,
    active: allOfferings.filter(o => o.offering.isActive).length,
    paused: allOfferings.filter(o => !o.offering.isActive).length,
    websites: new Set(allOfferings.map(o => o.website.id)).size
  };

  return <PublisherOfferingsGrid offerings={allOfferings} stats={stats} />;
}