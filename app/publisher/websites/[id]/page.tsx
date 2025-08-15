import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferingRelationships, publisherOfferings, publisherPerformance } from '@/lib/db/publisherOfferingsSchemaFixed';
import { eq, and } from 'drizzle-orm';
import PublisherWebsiteDetail from '@/components/publisher/PublisherWebsiteDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublisherWebsiteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  // Get website details
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });

  if (!website) {
    redirect('/publisher/websites');
  }

  // Get publisher's relationship with this website
  const relationship = await db.query.publisherOfferingRelationships.findFirst({
    where: and(
      eq(publisherOfferingRelationships.publisherId, session.publisherId),
      eq(publisherOfferingRelationships.websiteId, id)
    ),
  });

  if (!relationship) {
    redirect('/publisher/websites');
  }

  // Get offerings for this website
  const offerings = await db
    .select()
    .from(publisherOfferings)
    .where(eq(publisherOfferings.publisherRelationshipId, relationship.id));

  // Get performance metrics
  const performance = await db.query.publisherPerformance.findFirst({
    where: and(
      eq(publisherPerformance.publisherId, session.publisherId),
      eq(publisherPerformance.websiteId, id)
    ),
  });

  return (
    <PublisherWebsiteDetail
      website={website}
      relationship={relationship}
      offerings={offerings}
      performance={performance || null}
    />
  );
}