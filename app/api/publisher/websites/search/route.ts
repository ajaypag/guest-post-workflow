import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, sql, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { z } from 'zod';

// Input validation schema
const searchSchema = z.object({
  domain: z.string().min(1).max(255)
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get domain from query params
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    // Normalize the domain
    let normalizedDomain: string;
    try {
      const normalized = normalizeDomain(domain);
      normalizedDomain = normalized.domain;
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
        // Website not found - it's new
        return NextResponse.json({
          exists: false,
          website: null
        });
      }

      // Found with www prefix
      const websiteData = altWebsite[0];
      
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
        exists: true,
        website: websiteData,
        alreadyClaimed: existingRelationship.length > 0
      });
    }

    const websiteData = website[0];

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
      exists: true,
      website: websiteData,
      alreadyClaimed: existingRelationship.length > 0
    });

  } catch (error) {
    console.error('Website search error:', error);
    return NextResponse.json(
      { error: 'Failed to search website' },
      { status: 500 }
    );
  }
}