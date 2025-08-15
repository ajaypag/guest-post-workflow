import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherSchemaActual';
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

  // Get all offerings for this publisher with their relationships and websites
  // First, get the offerings
  const offerings = await db
    .select()
    .from(publisherOfferings)
    .where(eq(publisherOfferings.publisherId, session.publisherId));

  // Then get relationships and websites for these offerings
  const allOfferings = await Promise.all(
    offerings.map(async (offering) => {
      // Get relationships for this offering
      const relationships = await db
        .select({
          relationship: publisherOfferingRelationships,
          website: websites
        })
        .from(publisherOfferingRelationships)
        .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
        .where(eq(publisherOfferingRelationships.offeringId, offering.id));
      
      return relationships.map(rel => ({
        offering,
        relationship: rel.relationship,
        website: rel.website
      }));
    })
  );

  // Flatten the array
  const flattenedOfferings = allOfferings.flat();

  // Get statistics
  const stats = {
    total: flattenedOfferings.length,
    active: flattenedOfferings.filter(o => o.offering.isActive).length,
    paused: flattenedOfferings.filter(o => !o.offering.isActive).length,
    websites: new Set(flattenedOfferings.map(o => o.website.id)).size
  };

  return <PublisherOfferingsGrid offerings={flattenedOfferings} stats={stats} />;
}