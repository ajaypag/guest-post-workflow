import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships, publisherPricingRules, websites } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';

// GET /api/publisher/offerings/[id] - Get a single offering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offeringId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    // Get the offering with its associated website
    const offeringData = await db
      .select({
        offering: publisherOfferings,
        relationship: publisherOfferingRelationships,
        website: websites
      })
      .from(publisherOfferings)
      .leftJoin(
        publisherOfferingRelationships,
        eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
      )
      .leftJoin(
        websites,
        eq(websites.id, publisherOfferingRelationships.websiteId)
      )
      .where(
        and(
          eq(publisherOfferings.id, offeringId),
          eq(publisherOfferings.publisherId, session.publisherId)
        )
      )
      .limit(1);

    if (!offeringData || offeringData.length === 0) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }

    const { offering, website } = offeringData[0];

    // Get pricing rules for this offering
    const pricingRules = await db
      .select()
      .from(publisherPricingRules)
      .where(eq(publisherPricingRules.publisherOfferingId, offeringId));

    // Format the response
    const formattedOffering = {
      id: offering.id,
      offeringType: offering.offeringType,
      basePrice: offering.basePrice,
      currency: offering.currency,
      turnaroundDays: offering.turnaroundDays,
      minWordCount: offering.minWordCount,
      maxWordCount: offering.maxWordCount,
      currentAvailability: offering.currentAvailability,
      availableSlots: offering.availableSlots,
      expressAvailable: offering.expressAvailable,
      expressPrice: offering.expressPrice,
      expressDays: offering.expressDays,
      isActive: offering.isActive,
      attributes: offering.attributes,
      website: website ? {
        id: website.id,
        domain: website.domain,
        name: website.name,
        categories: website.categories
      } : null,
      pricingRules: pricingRules.map(rule => ({
        id: rule.id,
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions,
        priority: rule.priority,
        isActive: rule.isActive
      }))
    };

    return NextResponse.json({ offering: formattedOffering });

  } catch (error) {
    console.error('Error fetching offering:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offering' },
      { status: 500 }
    );
  }
}

// PUT /api/publisher/offerings/[id] - Update an offering
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offeringId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verify ownership
    const existingOffering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!existingOffering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only include fields that were provided in the request
    if (body.offeringType !== undefined) updateData.offeringType = body.offeringType;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.turnaroundDays !== undefined) updateData.turnaroundDays = body.turnaroundDays;
    if (body.minWordCount !== undefined) updateData.minWordCount = body.minWordCount;
    if (body.maxWordCount !== undefined) updateData.maxWordCount = body.maxWordCount;
    if (body.currentAvailability !== undefined) updateData.currentAvailability = body.currentAvailability;
    if (body.availableSlots !== undefined) updateData.availableSlots = body.availableSlots;
    if (body.expressAvailable !== undefined) updateData.expressAvailable = body.expressAvailable;
    if (body.expressPrice !== undefined) updateData.expressPrice = body.expressPrice;
    if (body.expressDays !== undefined) updateData.expressDays = body.expressDays;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.attributes !== undefined) updateData.attributes = body.attributes;

    // Update the offering
    await db.update(publisherOfferings)
      .set(updateData)
      .where(eq(publisherOfferings.id, offeringId));

    // If websiteId is provided, update the relationship
    if (body.websiteId) {
      // Check if relationship exists
      const existingRelationship = await db.query.publisherOfferingRelationships.findFirst({
        where: eq(publisherOfferingRelationships.offeringId, offeringId)
      });

      if (existingRelationship) {
        // Update existing relationship
        await db.update(publisherOfferingRelationships)
          .set({ 
            websiteId: body.websiteId,
            updatedAt: new Date()
          })
          .where(eq(publisherOfferingRelationships.offeringId, offeringId));
      } else {
        // Create new relationship
        await db.insert(publisherOfferingRelationships)
          .values({
            offeringId,
            websiteId: body.websiteId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Offering updated successfully' 
    });

  } catch (error) {
    console.error('Error updating offering:', error);
    return NextResponse.json(
      { error: 'Failed to update offering' },
      { status: 500 }
    );
  }
}

// DELETE /api/publisher/offerings/[id] - Delete an offering
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offeringId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    // Verify ownership
    const existingOffering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!existingOffering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete related records first
    await db.delete(publisherOfferingRelationships)
      .where(eq(publisherOfferingRelationships.offeringId, offeringId));

    await db.delete(publisherPricingRules)
      .where(eq(publisherPricingRules.publisherOfferingId, offeringId));

    // Delete the offering
    await db.delete(publisherOfferings)
      .where(eq(publisherOfferings.id, offeringId));

    return NextResponse.json({ 
      success: true, 
      message: 'Offering deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting offering:', error);
    return NextResponse.json(
      { error: 'Failed to delete offering' },
      { status: 500 }
    );
  }
}