import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships, websites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    
    console.log(`🔍 Database check for publisher: ${publisherId}`);
    
    // Get all offerings with potential website relationships
    const offeringsQuery = await db
      .select({
        // Offering fields
        id: publisherOfferings.id,
        offeringName: publisherOfferings.offeringName,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        isActive: publisherOfferings.isActive,
        
        // Relationship fields
        relationshipId: publisherOfferingRelationships.id,
        relationshipWebsiteId: publisherOfferingRelationships.websiteId,
        
        // Website fields
        websiteId: websites.id,
        websiteDomain: websites.domain,
      })
      .from(publisherOfferings)
      .leftJoin(
        publisherOfferingRelationships, 
        and(
          eq(publisherOfferingRelationships.offeringId, publisherOfferings.id),
          eq(publisherOfferingRelationships.isActive, true)
        )
      )
      .leftJoin(websites, eq(websites.id, publisherOfferingRelationships.websiteId))
      .where(eq(publisherOfferings.publisherId, publisherId));
    
    console.log(`📊 Found ${offeringsQuery.length} offering records`);

    // Process the results
    const offerings = offeringsQuery.map(row => ({
      id: row.id,
      offeringName: row.offeringName,
      offeringType: row.offeringType,
      basePrice: row.basePrice,
      isActive: row.isActive,
      hasRelationship: !!row.relationshipId,
      website: row.websiteId ? {
        id: row.websiteId,
        domain: row.websiteDomain
      } : null,
      relationshipDetails: row.relationshipId ? {
        relationshipId: row.relationshipId,
        websiteId: row.relationshipWebsiteId,
        domain: row.websiteDomain
      } : null
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
    console.error('Failed to check offering database:', error);
    return NextResponse.json(
      { error: 'Failed to check offering database' },
      { status: 500 }
    );
  }
}