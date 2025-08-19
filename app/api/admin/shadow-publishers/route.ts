import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';
import { publishers, publisherWebsites } from '@/lib/db/accountSchema';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq, desc, or, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch shadow publishers with their relationships
    const shadowPublishers = await db
      .select({
        publisher: publishers,
        websiteCount: db.$count(publisherWebsites, eq(publisherWebsites.publisherId, publishers.id)),
        offeringCount: db.$count(publisherOfferings, eq(publisherOfferings.publisherId, publishers.id)),
      })
      .from(publishers)
      .where(
        or(
          eq(publishers.accountStatus, 'shadow'),
          eq(publishers.accountStatus, 'active')
        )
      )
      .orderBy(desc(publishers.createdAt));

    // Transform the data
    const publishersWithDetails = await Promise.all(
      shadowPublishers.map(async (item) => {
        // Get websites for this publisher
        const publisherWebsiteRelations = await db
          .select({
            website: websites,
          })
          .from(publisherWebsites)
          .leftJoin(websites, eq(websites.id, publisherWebsites.websiteId))
          .where(eq(publisherWebsites.publisherId, item.publisher.id))
          .limit(5);

        // Get offerings for this publisher
        const offerings = await db
          .select()
          .from(publisherOfferings)
          .where(eq(publisherOfferings.publisherId, item.publisher.id))
          .limit(5);

        return {
          ...item.publisher,
          websites: publisherWebsiteRelations.map(r => r.website).filter(Boolean),
          offerings: offerings,
          websiteCount: item.websiteCount,
          offeringCount: item.offeringCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      publishers: publishersWithDetails,
      total: publishersWithDetails.length,
    });

  } catch (error) {
    console.error('Failed to fetch shadow publishers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}