import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';
import { z } from 'zod';

// GET /api/publishers/offerings - List publisher's offerings
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    // Get publisher ID from session
    // TODO: Update session type to include publisherId
    const publisherId = session.userId;
    
    // Get all websites and offerings for this publisher
    const websites = await publisherOfferingsService.getPublisherWebsites(publisherId);
    
    // For each website, get the offerings
    const websitesWithOfferings = await Promise.all(
      websites.map(async (item) => {
        const offerings = await publisherOfferingsService.getWebsiteOfferings(
          item.website.id,
          true // Active only
        );
        
        return {
          ...item,
          offerings: offerings.map(o => o.offering)
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: websitesWithOfferings
    });
    
  } catch (error) {
    console.error('Error fetching publisher offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offerings' },
      { status: 500 }
    );
  }
}

// POST /api/publishers/offerings - Create new offering
const createOfferingSchema = z.object({
  relationshipId: z.string().uuid(),
  offeringType: z.enum([
    'guest_post',
    'link_insertion',
    'homepage_link',
    'banner_ad',
    'press_release',
    'sponsored_post',
    'niche_edit'
  ]),
  offeringName: z.string().optional(),
  basePrice: z.number().positive(),
  currency: z.string().default('USD'),
  priceType: z.enum(['fixed', 'starting_at', 'negotiable', 'contact']).default('fixed'),
  turnaroundDays: z.number().positive().default(7),
  expressAvailable: z.boolean().default(false),
  expressDays: z.number().positive().optional(),
  expressPrice: z.number().positive().optional(),
  linkType: z.enum(['dofollow', 'nofollow', 'both', 'sponsored']).default('dofollow'),
  linkDuration: z.enum(['permanent', '12_months', '6_months', '3_months', 'custom']).default('permanent'),
  maxLinksPerPost: z.number().positive().default(1),
  attributes: z.record(z.any()).default({}),
  monthlyCapacity: z.number().positive().optional(),
  currentAvailability: z.enum(['available', 'limited', 'booked', 'paused']).default('available')
});

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validatedData = createOfferingSchema.parse(body);
    
    // Verify the publisher owns this relationship
    const publisherId = session.userId;
    const relationships = await publisherOfferingsService.getPublisherWebsites(publisherId);
    const ownsRelationship = relationships.some(
      r => r.relationship.id === validatedData.relationshipId
    );
    
    if (!ownsRelationship) {
      return NextResponse.json(
        { error: 'You do not have permission to create offerings for this website' },
        { status: 403 }
      );
    }
    
    // Create the offering
    const { relationshipId, ...offeringData } = validatedData;
    const offering = await publisherOfferingsService.createOffering(
      relationshipId,
      {
        ...offeringData,
        basePrice: offeringData.basePrice.toString(),
        expressDays: offeringData.expressDays || null,
        expressPrice: offeringData.expressPrice?.toString() || null,
        monthlyCapacity: offeringData.monthlyCapacity || null,
        isActive: true,
        isFeatured: false
      }
    );
    
    return NextResponse.json({
      success: true,
      data: offering
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating offering:', error);
    return NextResponse.json(
      { error: 'Failed to create offering' },
      { status: 500 }
    );
  }
}