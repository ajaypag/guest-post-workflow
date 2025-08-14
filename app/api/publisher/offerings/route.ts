import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';

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
      publisherRelationshipId,
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
    if (!publisherRelationshipId || !offeringType || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the offering
    const offering = await publisherOfferingsService.createOffering(
      publisherRelationshipId,
      {
        offeringType,
        basePrice: basePrice.toString(), // Convert to string for DECIMAL
        currency: currency || 'USD',
        turnaroundDays: turnaroundDays || 7,
        isActive: isActive ?? true,
        availability: availability || 'available',
        contentRequirements: contentRequirements || {},
        restrictions: restrictions || {},
        metadata: {},
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