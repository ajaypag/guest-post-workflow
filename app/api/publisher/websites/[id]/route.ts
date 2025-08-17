import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/services/authServiceServer';

// GET /api/publisher/websites/[id] - Get website details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session?.userId || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publisherId = session.userId;
    const websiteId = params.id;

    // Get website with offering details
    const result = await db
      .select({
        website: websites,
        relationship: publisherOfferingRelationships,
        offering: publisherOfferings
      })
      .from(websites)
      .leftJoin(
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
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!result.length) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { website, relationship, offering } = result[0];

    // Check if this publisher owns this website
    if (!relationship) {
      return NextResponse.json({ error: 'You do not have access to this website' }, { status: 403 });
    }

    return NextResponse.json({
      website: {
        ...website,
        verificationStatus: relationship.verificationStatus,
        offering: offering ? {
          id: offering.id,
          basePrice: offering.basePrice,
          turnaroundDays: offering.turnaroundDays,
          currentAvailability: offering.currentAvailability,
          expressAvailable: offering.expressAvailable,
          expressPrice: offering.expressPrice,
          expressDays: offering.expressDays
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

// PUT /api/publisher/websites/[id] - Update website
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session?.userId || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publisherId = session.userId;
    const websiteId = params.id;
    const body = await request.json();

    // Check if publisher owns this website
    const relationship = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferingRelationships.publisherId, publisherId)
        )
      )
      .limit(1);

    if (!relationship.length) {
      return NextResponse.json({ error: 'You do not have access to this website' }, { status: 403 });
    }

    // Update website information
    if (body.category || body.monthlyTraffic !== undefined || body.domainAuthority !== undefined) {
      await db
        .update(websites)
        .set({
          categories: body.category ? [body.category] : undefined,
          monthlyTraffic: body.monthlyTraffic,
          domainAuthority: body.domainAuthority,
          language: body.language,
          country: body.country,
          updatedAt: new Date()
        })
        .where(eq(websites.id, websiteId));
    }

    // Update offering if it exists or create new one
    const offeringId = relationship[0].offeringId;
    
    if (offeringId) {
      // Update existing offering
      await db
        .update(publisherOfferings)
        .set({
          basePrice: body.basePrice,
          turnaroundDays: body.turnaroundDays,
          expressAvailable: body.expressAvailable,
          expressPrice: body.expressPrice,
          expressDays: body.expressDays,
          updatedAt: new Date()
        })
        .where(eq(publisherOfferings.id, offeringId));
    } else if (body.basePrice) {
      // Create new offering and link it
      const [newOffering] = await db
        .insert(publisherOfferings)
        .values({
          publisherId: publisherId,
          offeringType: 'guest_post',
          basePrice: body.basePrice,
          currency: 'USD',
          turnaroundDays: body.turnaroundDays || 7,
          currentAvailability: 'available',
          expressAvailable: body.expressAvailable || false,
          expressPrice: body.expressPrice,
          expressDays: body.expressDays,
          isActive: true
        })
        .returning();

      // Update relationship with offering ID
      await db
        .update(publisherOfferingRelationships)
        .set({
          offeringId: newOffering.id,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(publisherOfferingRelationships.websiteId, websiteId),
            eq(publisherOfferingRelationships.publisherId, publisherId)
          )
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Website updated successfully'
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

// DELETE /api/publisher/websites/[id] - Delete website
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session?.userId || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publisherId = session.userId;
    const websiteId = params.id;

    // Check if publisher owns this website
    const relationship = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferingRelationships.publisherId, publisherId)
        )
      )
      .limit(1);

    if (!relationship.length) {
      return NextResponse.json({ error: 'You do not have access to this website' }, { status: 403 });
    }

    // Soft delete by marking as inactive
    await db
      .update(publisherOfferingRelationships)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(publisherOfferingRelationships.websiteId, websiteId),
          eq(publisherOfferingRelationships.publisherId, publisherId)
        )
      );

    // Also mark offering as inactive if it exists
    if (relationship[0].offeringId) {
      await db
        .update(publisherOfferings)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(publisherOfferings.id, relationship[0].offeringId));
    }

    return NextResponse.json({
      success: true,
      message: 'Website removed successfully'
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}