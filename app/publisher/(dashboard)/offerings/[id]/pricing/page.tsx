import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships, publisherPricingRules } from '@/lib/db/publisherOfferingsSchemaFixed';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';
import PricingRuleBuilder from '@/components/publisher/PricingRuleBuilder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferingPricingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  // Get offering with website info
  const offeringData = await db
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
    .where(
      and(
        eq(publisherOfferings.id, id),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      )
    )
    .limit(1);

  if (!offeringData[0]) {
    redirect('/publisher/offerings');
  }

  // Get existing pricing rules
  const pricingRules = await db
    .select()
    .from(publisherPricingRules)
    .where(eq(publisherPricingRules.publisherOfferingId, id));

  return (
    <div className="max-w-6xl mx-auto">
      <PricingRuleBuilder
        offering={offeringData[0].offering}
        website={offeringData[0].website}
        existingRules={pricingRules}
      />
    </div>
  );
}