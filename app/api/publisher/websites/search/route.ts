import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferingRelationships } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { z } from 'zod';

// Input validation schema
const searchSchema = z.object({
  domain: z.string().min(1).max(255)
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = searchSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    // Normalize the domain
    let normalizedDomain: string;
    try {
      normalizedDomain = normalizeDomain(domain);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Search for the website
    const website = await db.select({
      id: websites.id,
      domain: websites.domain,
      normalizedDomain: sql<string>`${websites.domain}`, // We'll add normalized_domain column
      domainRating: websites.domainRating,
      totalTraffic: websites.totalTraffic,
      guestPostCost: websites.guestPostCost,
    })
    .from(websites)
    .where(eq(websites.domain, normalizedDomain))
    .limit(1);

    if (website.length === 0) {
      // Also try with www prefix if not found
      const wwwDomain = `www.${normalizedDomain}`;
      const altWebsite = await db.select({
        id: websites.id,
        domain: websites.domain,
        normalizedDomain: sql<string>`${websites.domain}`,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
      })
      .from(websites)
      .where(eq(websites.domain, wwwDomain))
      .limit(1);

      if (altWebsite.length === 0) {
        return NextResponse.json(
          { error: 'Website not found', domain: normalizedDomain },
          { status: 404 }
        );
      }

      // Found with www prefix
      const websiteData = altWebsite[0];
      
      // Check if there are existing publishers
      const publishers = await db.select({
        count: sql<number>`count(*)::int`
      })
      .from(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.websiteId, websiteData.id));

      const publisherCount = publishers[0]?.count || 0;

      // Check if current publisher already has a relationship
      const existingRelationship = await db.select({
        id: publisherOfferingRelationships.id
      })
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteData.id),
          eq(publisherOfferingRelationships.publisherId, session.publisherId!)
        )
      )
      .limit(1);

      return NextResponse.json({
        website: {
          ...websiteData,
          hasPublishers: publisherCount > 0,
          publisherCount,
          isAvailable: existingRelationship.length === 0
        }
      });
    }

    const websiteData = website[0];

    // Check if there are existing publishers
    const publishers = await db.select({
      count: sql<number>`count(*)::int`
    })
    .from(publisherOfferingRelationships)
    .where(eq(publisherOfferingRelationships.websiteId, websiteData.id));

    const publisherCount = publishers[0]?.count || 0;

    // Check if current publisher already has a relationship
    const existingRelationship = await db.select({
      id: publisherOfferingRelationships.id
    })
    .from(publisherOfferingRelationships)
    .where(
      and(
        eq(publisherOfferingRelationships.websiteId, websiteData.id),
        eq(publisherOfferingRelationships.publisherId, session.publisherId!)
      )
    )
    .limit(1);

    return NextResponse.json({
      website: {
        ...websiteData,
        hasPublishers: publisherCount > 0,
        publisherCount,
        isAvailable: existingRelationship.length === 0
      }
    });

  } catch (error) {
    console.error('Website search error:', error);
    return NextResponse.json(
      { error: 'Failed to search website' },
      { status: 500 }
    );
  }
}