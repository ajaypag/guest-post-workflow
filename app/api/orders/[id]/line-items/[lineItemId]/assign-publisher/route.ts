import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    const { id: orderId, lineItemId } = await params;
    const { publisherId, offeringId, price } = await request.json();

    if (!publisherId || !offeringId) {
      return NextResponse.json(
        { error: 'Publisher ID and Offering ID are required' },
        { status: 400 }
      );
    }

    // Verify the line item exists and belongs to this order
    const lineItem = await db.query.orderLineItems.findFirst({
      where: eq(orderLineItems.id, params.lineItemId)
    });

    if (!lineItem || lineItem.orderId !== params.id) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Verify the publisher and offering exist
    const offering = await db.query.publisherOfferings.findFirst({
      where: eq(publisherOfferings.id, offeringId)
    });

    if (!offering || offering.publisherId !== publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher or offering' },
        { status: 400 }
      );
    }

    // Update the line item with manual publisher assignment
    await db.update(orderLineItems)
      .set({
        publisherId: publisherId,
        publisherOfferingId: offeringId,
        publisherPrice: price || offering.basePrice,
        publisherStatus: 'pending',
        metadata: {
          ...lineItem.metadata,
          manualAssignment: true,
          assignedBy: session.userId,
          assignedAt: new Date().toISOString(),
          assignmentReason: 'Manual override by internal team'
        },
        modifiedAt: new Date(),
        modifiedBy: session.userId
      })
      .where(eq(orderLineItems.id, params.lineItemId));

    // Get updated line item with publisher info
    const updatedLineItem = await db.query.orderLineItems.findFirst({
      where: eq(orderLineItems.id, params.lineItemId),
      with: {
        order: true
      }
    });

    // Get publisher details for response
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, publisherId)
    });

    return NextResponse.json({
      success: true,
      lineItem: updatedLineItem,
      publisher: publisher ? {
        id: publisher.id,
        contactName: publisher.contactName,
        companyName: publisher.companyName,
        email: publisher.email
      } : null,
      offering: {
        id: offering.id,
        name: offering.offeringName,
        price: offering.basePrice,
        turnaroundDays: offering.turnaroundDays
      }
    });

  } catch (error) {
    console.error('Error assigning publisher:', error);
    return NextResponse.json(
      { error: 'Failed to assign publisher' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; lineItemId: string } }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    // Get the line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: eq(orderLineItems.id, params.lineItemId)
    });

    if (!lineItem || lineItem.orderId !== params.id) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Get all available publishers and their offerings for this domain
    let availableOfferings = [];
    
    if (lineItem.assignedDomain) {
      // First, get the website ID for this domain
      const { websites } = await import('@/lib/db/websiteSchema');
      const { publisherOfferingRelationships } = await import('@/lib/db/publisherSchemaActual');
      const { and } = await import('drizzle-orm');
      
      const website = await db.query.websites.findFirst({
        where: eq(websites.domain, lineItem.assignedDomain)
      });
      
      if (website) {
        // Get offerings linked to this website through publisher_offering_relationships table
        const offerings = await db
          .select({
            offering: publisherOfferings,
            publisher: publishers,
            relationship: publisherOfferingRelationships
          })
          .from(publisherOfferingRelationships)
          .innerJoin(publisherOfferings, eq(publisherOfferingRelationships.offeringId, publisherOfferings.id))
          .innerJoin(publishers, eq(publisherOfferings.publisherId, publishers.id))
          .where(
            and(
              eq(publisherOfferingRelationships.websiteId, website.id),
              eq(publisherOfferingRelationships.isActive, true),
              eq(publisherOfferings.isActive, true)
            )
          )
          .orderBy(publisherOfferingRelationships.isPrimary, publisherOfferingRelationships.priorityRank);

        availableOfferings = offerings.map(row => ({
          id: row.offering.id,
          publisherId: row.offering.publisherId,
          publisherName: row.publisher?.contactName || row.publisher?.companyName || 'Unknown Publisher',
          publisherEmail: row.publisher?.email,
          offeringName: row.offering.offeringName,
          basePrice: row.offering.basePrice,
          turnaroundDays: row.offering.turnaroundDays,
          expressAvailable: row.offering.expressAvailable,
          expressPrice: row.offering.expressPrice,
          currentAvailability: row.offering.currentAvailability,
          isPrimary: row.relationship.isPrimary,
          isPreferred: row.relationship.isPreferred
        }));
      }
    }

    return NextResponse.json({
      lineItem: {
        id: lineItem.id,
        domain: lineItem.assignedDomain,
        currentPublisherId: lineItem.publisherId,
        currentOfferingId: lineItem.publisherOfferingId,
        currentPrice: lineItem.publisherPrice
      },
      availableOfferings
    });

  } catch (error) {
    console.error('Error fetching publisher options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publisher options' },
      { status: 500 }
    );
  }
}