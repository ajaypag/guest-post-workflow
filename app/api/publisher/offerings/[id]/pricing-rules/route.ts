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