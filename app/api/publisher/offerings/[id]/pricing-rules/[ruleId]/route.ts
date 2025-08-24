import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherPricingRules } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';

// PUT /api/publisher/offerings/[id]/pricing-rules/[ruleId] - Update a pricing rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id: offeringId, ruleId } = await params;
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

    // Verify ownership of the offering
    const offerings = await db
      .select()
      .from(publisherOfferings)
      .where(and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      ))
      .limit(1);
    
    const offering = offerings[0];

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify the rule exists and belongs to this offering
    const existingRules = await db
      .select()
      .from(publisherPricingRules)
      .where(and(
        eq(publisherPricingRules.id, ruleId),
        eq(publisherPricingRules.publisherOfferingId, offeringId)
      ))
      .limit(1);
    
    const existingRule = existingRules[0];

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build update object
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.ruleName !== undefined) updateData.ruleName = body.ruleName;
    if (body.ruleType !== undefined) updateData.ruleType = body.ruleType;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.conditions !== undefined) updateData.conditions = body.conditions;
    if (body.actions !== undefined) updateData.actions = body.actions;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.isCumulative !== undefined) updateData.isCumulative = body.isCumulative;
    if (body.autoApply !== undefined) updateData.autoApply = body.autoApply;
    if (body.requiresApproval !== undefined) updateData.requiresApproval = body.requiresApproval;
    if (body.validFrom !== undefined) updateData.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Update the pricing rule
    await db.update(publisherPricingRules)
      .set(updateData)
      .where(eq(publisherPricingRules.id, ruleId));

    return NextResponse.json({ 
      success: true,
      message: 'Pricing rule updated successfully'
    });

  } catch (error) {
    console.error('Error updating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/publisher/offerings/[id]/pricing-rules/[ruleId] - Delete a pricing rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id: offeringId, ruleId } = await params;
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

    // Verify ownership of the offering
    const offerings = await db
      .select()
      .from(publisherOfferings)
      .where(and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      ))
      .limit(1);
    
    const offering = offerings[0];

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify the rule exists and belongs to this offering
    const existingRules = await db
      .select()
      .from(publisherPricingRules)
      .where(and(
        eq(publisherPricingRules.id, ruleId),
        eq(publisherPricingRules.publisherOfferingId, offeringId)
      ))
      .limit(1);
    
    const existingRule = existingRules[0];

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    // Delete the pricing rule
    await db.delete(publisherPricingRules)
      .where(eq(publisherPricingRules.id, ruleId));

    return NextResponse.json({ 
      success: true,
      message: 'Pricing rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing rule' },
      { status: 500 }
    );
  }
}