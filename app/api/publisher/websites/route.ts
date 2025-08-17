import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export async function GET(request: NextRequest) {
  try {
    // Verify publisher authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const publisherId = session.publisherId;
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID not found' },
        { status: 400 }
      );
    }

    // Get websites associated with this publisher through relationships
    const publisherWebsites = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        categories: websites.categories,
        verificationStatus: publisherOfferingRelationships.verificationStatus,
        createdAt: websites.createdAt,
        offeringsCount: sql<number>`COUNT(DISTINCT ${publisherOfferings.id})`,
      })
      .from(websites)
      .innerJoin(
        publisherOfferingRelationships,
        and(
          eq(publisherOfferingRelationships.websiteId, websites.id),
          eq(publisherOfferingRelationships.publisherId, publisherId)
        )
      )
      .leftJoin(
        publisherOfferings,
        eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
      )
      .groupBy(websites.id, publisherOfferingRelationships.verificationStatus);

    return NextResponse.json({
      websites: publisherWebsites
    });
  } catch (error) {
    console.error('Error fetching publisher websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify publisher authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const publisherId = session.publisherId;
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      domain: rawDomain,
      name,
      category,
      description,
      monthlyTraffic,
      domainAuthority,
      language,
      country
    } = body;

    if (!rawDomain || !category) {
      return NextResponse.json(
        { error: 'Domain and category are required' },
        { status: 400 }
      );
    }

    // Normalize the domain
    const domain = normalizeDomain(rawDomain);

    // Check if website already exists
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.domain, domain))
      .limit(1);

    let websiteId: string;

    if (existingWebsite.length > 0) {
      // Website already exists
      websiteId = existingWebsite[0].id;

      // Check if this publisher already has an offering for this website
      const existingOffering = await db
        .select()
        .from(publisherOfferings)
        .where(
          and(
            eq(publisherOfferings.website_id, websiteId),
            eq(publisherOfferings.publisher_id, publisherId)
          )
        )
        .limit(1);

      if (existingOffering.length > 0) {
        return NextResponse.json(
          { error: 'You already have this website in your portfolio' },
          { status: 400 }
        );
      }
    } else {
      // Create new website
      const now = new Date();
      const newWebsite = await db
        .insert(websites)
        .values({
          domain,
          categories: category ? [category] : null,
          source: 'publisher',
          addedByPublisherId: publisherId,
          airtableCreatedAt: now,
          airtableUpdatedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      websiteId = newWebsite[0].id;
    }

    // Create publisher offering
    const [offering] = await db
      .insert(publisherOfferings)
      .values({
        publisherId: publisherId,
        offeringType: 'guest_post',
        basePrice: 10000, // Default $100 in cents
        currency: 'USD',
        turnaroundDays: 7,
        currentAvailability: 'available',
        isActive: true
      })
      .returning();

    // Link the offering to the website
    await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId: publisherId,
        offeringId: offering.id,
        websiteId: websiteId,
        isPrimary: true,
        isActive: true,
        relationshipType: 'owner',
        verificationStatus: 'pending'
      });

    return NextResponse.json({
      success: true,
      websiteId,
      message: 'Website added successfully'
    });
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json(
      { error: 'Failed to add website' },
      { status: 500 }
    );
  }
}