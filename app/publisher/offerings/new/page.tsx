import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { publisherOfferingRelationships } from '@/lib/db/publisherOfferingsSchemaFixed';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';
import OfferingForm from '@/components/publisher/OfferingForm';

export default async function NewOfferingPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  // Get publisher's websites
  const publisherWebsites = await db
    .select({
      relationship: publisherOfferingRelationships,
      website: websites
    })
    .from(publisherOfferingRelationships)
    .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
    .where(
      and(
        eq(publisherOfferingRelationships.publisherId, session.publisherId),
        eq(publisherOfferingRelationships.isActive, true)
      )
    );

  if (publisherWebsites.length === 0) {
    redirect('/publisher/websites');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <OfferingForm 
        websites={publisherWebsites}
        isNew={true}
      />
    </div>
  );
}