import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/accountSchema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { authenticateRequest } from '@/lib/auth/authenticateRequest';

export async function GET(request: Request) {
  try {
    // Check authentication - admin only
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Check if user is internal/admin
    if (authResult.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Fetch all websites with their prices
    const websitesWithPrices = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        currentPrice: websites.guestPostCost,
      })
      .from(websites)
      .where(isNotNull(websites.guestPostCost));

    // For each website, calculate the derived price
    const comparisons = await Promise.all(
      websitesWithPrices.map(async (website) => {
        try {
          // Get all offerings for this website
          const offerings = await db
          .select({
            basePrice: publisherOfferings.basePrice,
            publisherName: publishers.contactName,
            isActive: publisherOfferings.isActive,
          })
          .from(publisherOfferingRelationships)
          .innerJoin(
            publisherOfferings,
            eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
          )
          .innerJoin(
            publishers,
            eq(publisherOfferings.publisherId, publishers.id)
          )
          .where(
            and(
              eq(publisherOfferingRelationships.websiteId, website.id),
              eq(publisherOfferings.isActive, true),
              eq(publisherOfferings.offeringType, 'guest_post')
            )
          );

        // Calculate derived price (minimum of all active offerings)
        // Already filtered for isActive in the query
        const offeringPrices = offerings
          .map(o => o.basePrice)
          .filter(p => p !== null && p !== undefined) as number[];
        
        const derivedPrice = offeringPrices.length > 0 
          ? Math.min(...offeringPrices)
          : null;

        const publisherNames = offerings
          .map(o => o.publisherName)
          .filter((name): name is string => name !== null && name !== undefined);
        const uniquePublisherNames = [...new Set(publisherNames)];

        // Calculate difference
        let difference = null;
        let percentDifference = null;
        let status: 'match' | 'mismatch' | 'missing_offering' = 'missing_offering';

        if (website.currentPrice && derivedPrice) {
          difference = derivedPrice - website.currentPrice;
          percentDifference = (difference / website.currentPrice) * 100;
          status = website.currentPrice === derivedPrice ? 'match' : 'mismatch';
        } else if (!derivedPrice) {
          status = 'missing_offering';
        }

        return {
          id: website.id,
          domain: website.domain,
          currentGuestPostCost: website.currentPrice,
          derivedPrice,
          offeringCount: offerings.length,
          offeringPrices,
          publisherNames: uniquePublisherNames,
          difference,
          percentDifference,
          status,
        };
        } catch (error) {
          // Log error but continue processing other websites
          console.error(`Error processing website ${website.domain}:`, error);
          return {
            id: website.id,
            domain: website.domain,
            currentGuestPostCost: website.currentPrice,
            derivedPrice: null,
            offeringCount: 0,
            offeringPrices: [],
            publisherNames: [],
            difference: null,
            percentDifference: null,
            status: 'missing_offering' as const,
          };
        }
      })
    );

    // Calculate statistics
    const stats = {
      total: comparisons.length,
      matches: comparisons.filter(c => c.status === 'match').length,
      mismatches: comparisons.filter(c => c.status === 'mismatch').length,
      missingOfferings: comparisons.filter(c => c.status === 'missing_offering').length,
      readyPercentage: 0,
    };

    stats.readyPercentage = stats.total > 0 
      ? (stats.matches / stats.total) * 100 
      : 0;

    // Sort comparisons: problems first, then by domain
    comparisons.sort((a, b) => {
      // Priority: missing_offering > mismatch > match
      const statusPriority = { missing_offering: 0, mismatch: 1, match: 2 };
      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.domain.localeCompare(b.domain);
    });

    return NextResponse.json({
      comparisons,
      stats,
    });
  } catch (error) {
    console.error('Error fetching pricing comparisons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing comparisons', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}