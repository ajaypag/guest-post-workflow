import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, websites } from '@/lib/db/schema';
import { publisherOfferingRelationships } from '@/lib/db/publisherOfferingsSchemaFixed';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active publishers with their website counts
    const publishersData = await db
      .select({
        publisher: publishers,
        websiteCount: sql<number>`COUNT(DISTINCT ${publisherOfferingRelationships.websiteId})`,
      })
      .from(publishers)
      .leftJoin(
        publisherOfferingRelationships,
        and(
          eq(publisherOfferingRelationships.publisherId, publishers.id),
          eq(publisherOfferingRelationships.isActive, true)
        )
      )
      .where(eq(publishers.status, 'active'))
      .groupBy(publishers.id)
      .orderBy(publishers.companyName);

    // Get websites for each publisher for domain matching
    const publisherWebsites = await db
      .select({
        publisherId: publisherOfferingRelationships.publisherId,
        website: websites,
      })
      .from(publisherOfferingRelationships)
      .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
      .where(eq(publisherOfferingRelationships.isActive, true));

    // Group websites by publisher
    const websitesByPublisher = publisherWebsites.reduce((acc, item) => {
      const publisherId = item.publisherId;
      if (!acc[publisherId]) {
        acc[publisherId] = [];
      }
      acc[publisherId].push(item.website);
      return acc;
    }, {} as Record<string, any[]>);

    // Combine publisher data with their websites
    const availablePublishers = publishersData.map(({ publisher, websiteCount }) => ({
      id: publisher.id,
      name: publisher.companyName || publisher.contactName,
      email: publisher.email,
      status: publisher.status,
      websiteCount,
      websites: websitesByPublisher[publisher.id] || [],
      // Add domain list for quick reference
      domains: (websitesByPublisher[publisher.id] || []).map(w => w.domain)
    }));

    return NextResponse.json({
      publishers: availablePublishers
    });

  } catch (error) {
    console.error('Error fetching available publishers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishers' },
      { status: 500 }
    );
  }
}