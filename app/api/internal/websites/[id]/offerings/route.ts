import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { eq, sql } from 'drizzle-orm';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get offerings for this website through publisher_offering_relationships
    const offeringsData = await db
      .select({
        id: publisherOfferings.id,
        type: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        turnaroundDays: publisherOfferings.turnaroundDays,
        isActive: publisherOfferings.isActive,
      })
      .from(publisherOfferings)
      .innerJoin(publisherOfferingRelationships, eq(publisherOfferingRelationships.offeringId, publisherOfferings.id))
      .where(eq(publisherOfferingRelationships.websiteId, id));

    // Format the offerings for display
    const formattedOfferings = offeringsData.map(offer => ({
      ...offer,
      type: offer.type === 'guest_post' ? 'Guest Post' : 
            offer.type === 'link_insertion' ? 'Link Insertion' : 
            offer.type || 'Unknown',
      basePrice: offer.basePrice || 0
    }));

    return NextResponse.json({
      offerings: formattedOfferings,
      count: formattedOfferings.length
    });
  } catch (error) {
    console.error('Failed to fetch offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}