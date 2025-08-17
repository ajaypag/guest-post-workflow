import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships, publisherPricingRules } from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/publisher/offerings - Get all offerings for the logged-in publisher
export async function GET(request: NextRequest) {
  try {
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

    // Get all offerings with their associated websites and pricing rules
    const offeringsData = await db
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
      .where(eq(publisherOfferings.publisherId, session.publisherId));

    // Get pricing rules for each offering
    const offeringIds = [...new Set(offeringsData.map(o => o.offering.id))];
    const pricingRulesData = offeringIds.length > 0 
      ? await db
          .select()
          .from(publisherPricingRules)
          .innerJoin(
            publisherOfferings,
            eq(publisherPricingRules.publisherOfferingId, publisherOfferings.id)
          )
          .where(eq(publisherOfferings.publisherId, session.publisherId))
      : [];

    // Group pricing rules by offering
    const pricingRulesByOffering = pricingRulesData.reduce((acc, data) => {
      const rule = data.publisher_pricing_rules;
      if (rule.publisherOfferingId) {
        if (!acc[rule.publisherOfferingId]) {
          acc[rule.publisherOfferingId] = [];
        }
        acc[rule.publisherOfferingId].push({
          id: rule.id,
          ruleName: rule.ruleName,
          isActive: rule.isActive
        });
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Format the response
    const offerings = offeringsData.map(({ offering, website }) => ({
      id: offering.id,
      offeringType: offering.offeringType,
      basePrice: offering.basePrice,
      currency: offering.currency,
      turnaroundDays: offering.turnaroundDays,
      currentAvailability: offering.currentAvailability,
      expressAvailable: offering.expressAvailable,
      expressPrice: offering.expressPrice,
      expressDays: offering.expressDays,
      isActive: offering.isActive,
      website: website ? {
        id: website.id,
        domain: website.domain,
        categories: website.categories
      } : null,
      pricingRules: pricingRulesByOffering[offering.id] || []
    }));

    return NextResponse.json({ offerings });
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      offeringType,
      basePrice,
      currency,
      turnaroundDays,
      isActive,
      availability,
      contentRequirements,
      restrictions,
    } = body;

    // Validate required fields
    if (!offeringType || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the offering using the authenticated publisher's ID
    const offering = await publisherOfferingsService.createOffering(
      session.publisherId,
      {
        offeringType,
        basePrice: Number(basePrice), // Ensure it's a number for validation
        currency: currency || 'USD',
        turnaroundDays: turnaroundDays || 7,
        isActive: isActive ?? true,
        currentAvailability: availability || 'available',
        attributes: {
          contentRequirements: contentRequirements || {},
          restrictions: restrictions || {},
        },
      }
    );

    return NextResponse.json({
      success: true,
      offering,
    });
  } catch (error) {
    console.error('Create offering error:', error);
    return NextResponse.json(
      { error: 'Failed to create offering' },
      { status: 500 }
    );
  }
}