import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships, websites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    // Get offerings with website relationships
    const offeringsQuery = await db
      .select({
        id: publisherOfferings.id,
        offeringName: publisherOfferings.offeringName,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        isActive: publisherOfferings.isActive,
        website: {
          id: websites.id,
          domain: websites.domain,
          categories: websites.categories,
        },
      })
      .from(publisherOfferings)
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferingRelationships.offeringId, publisherOfferings.id))
      .leftJoin(websites, eq(websites.id, publisherOfferingRelationships.websiteId))
      .where(eq(publisherOfferings.publisherId, publisherId));
    
    // Format response
    const offerings = offeringsQuery.map(row => ({
      id: row.id,
      offeringName: row.offeringName,
      offeringType: row.offeringType,
      basePrice: row.basePrice,
      currency: row.currency,
      isActive: row.isActive,
      website: row.website ? {
        id: row.website.id,
        domain: row.website.domain,
        categories: row.website.categories,
      } : null,
    }));
    
    return NextResponse.json({
      success: true,
      publisherId,
      totalOfferings: offerings.length,
      offeringsWithWebsites: offerings.filter(o => o.website).length,
      offeringsWithoutWebsites: offerings.filter(o => !o.website).length,
      offerings
    });
    
  } catch (error) {
    console.error('Failed to test offerings-websites:', error);
    return NextResponse.json(
      { error: 'Failed to test offerings-websites' },
      { status: 500 }
    );
  }
}