import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherPricingRules } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/publisher/offerings/[id]/pricing-rules - Get pricing rules for an offering
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

    // Verify ownership of the offering
    const offering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get pricing rules for this offering
    const rules = await db
      .select()
      .from(publisherPricingRules)
      .where(eq(publisherPricingRules.publisherOfferingId, offeringId));

    return NextResponse.json({ 
      pricingRules: rules.map(rule => ({
        id: rule.id,
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions,
        priority: rule.priority,
        isCumulative: rule.isCumulative,
        autoApply: rule.autoApply,
        requiresApproval: rule.requiresApproval,
        validFrom: rule.validFrom,
        validUntil: rule.validUntil,
        isActive: rule.isActive,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

// POST /api/publisher/offerings/[id]/pricing-rules - Create a new pricing rule
export async function POST(
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

    // Verify ownership of the offering
    const offering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.ruleName || !body.ruleType || !body.conditions || !body.actions) {
      return NextResponse.json(
        { error: 'Missing required fields (ruleName, ruleType, conditions, actions)' },
        { status: 400 }
      );
    }

    // Create the pricing rule
    const newRule = {
      id: uuidv4(),
      publisherOfferingId: offeringId,
      ruleName: body.ruleName,
      ruleType: body.ruleType, // 'word_count', 'turnaround', 'link_type', etc.
      description: body.description || null,
      conditions: body.conditions, // JSONB object with rule conditions
      actions: body.actions, // JSONB object with actions (e.g., { adjustmentType: 'percentage', adjustmentValue: 10 })
      priority: body.priority || 0,
      isCumulative: body.isCumulative || false,
      autoApply: body.autoApply !== false,
      requiresApproval: body.requiresApproval || false,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(publisherPricingRules).values(newRule);

    return NextResponse.json({ 
      success: true,
      message: 'Pricing rule created successfully',
      pricingRule: newRule
    });

  } catch (error) {
    console.error('Error creating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing rule' },
      { status: 500 }
    );
  }
}

// PUT /api/publisher/offerings/[id]/pricing-rules/[ruleId] - Update a pricing rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offeringId } = await params;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const ruleId = pathParts[pathParts.length - 1];

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
    const offering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify the rule exists and belongs to this offering
    const existingRule = await db.query.publisherPricingRules.findFirst({
      where: and(
        eq(publisherPricingRules.id, ruleId),
        eq(publisherPricingRules.publisherOfferingId, offeringId)
      )
    });

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offeringId } = await params;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const ruleId = pathParts[pathParts.length - 1];

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
    const offering = await db.query.publisherOfferings.findFirst({
      where: and(
        eq(publisherOfferings.id, offeringId),
        eq(publisherOfferings.publisherId, session.publisherId)
      )
    });

    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify the rule exists and belongs to this offering
    const existingRule = await db.query.publisherPricingRules.findFirst({
      where: and(
        eq(publisherPricingRules.id, ruleId),
        eq(publisherPricingRules.publisherOfferingId, offeringId)
      )
    });

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