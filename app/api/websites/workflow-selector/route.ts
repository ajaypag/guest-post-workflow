import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { asc, desc, isNotNull } from 'drizzle-orm';

// GET all websites for workflow selector (optimized for dropdown)
export async function GET(request: Request) {
  try {
    // Fetch all websites that have guest post capability
    // Ordered by quality and domain rating for best options first
    const allWebsites = await db.select({
      id: websites.id,
      domain: websites.domain,
      domainRating: websites.domainRating,
      totalTraffic: websites.totalTraffic,
      guestPostCost: websites.guestPostCost,
      categories: websites.categories,
      niche: websites.niche,
      type: websites.type,
      overallQuality: websites.overallQuality,
      publisherCompany: websites.publisherCompany,
      hasGuestPost: websites.hasGuestPost,
      publisherTier: websites.publisherTier,
      typicalTurnaroundDays: websites.typicalTurnaroundDays,
    })
    .from(websites)
    .where(isNotNull(websites.hasGuestPost)) // Only websites with guest post info
    .orderBy(
      desc(websites.overallQuality), // Best quality first
      desc(websites.domainRating),    // Then by domain rating
      asc(websites.domain)             // Then alphabetically
    );

    // Transform for frontend consumption
    const transformedWebsites = allWebsites.map(w => ({
      id: w.id,
      domain: w.domain,
      domainRating: w.domainRating,
      totalTraffic: w.totalTraffic,
      guestPostCost: w.guestPostCost,
      categories: w.categories || [],
      niche: w.niche || [],
      type: w.type || [],
      overallQuality: w.overallQuality,
      publisherCompany: w.publisherCompany,
      hasGuestPost: w.hasGuestPost,
      publisherTier: w.publisherTier,
      typicalTurnaroundDays: w.typicalTurnaroundDays,
    }));

    // Set cache headers for 10 minutes (websites don't change often)
    return NextResponse.json(
      { 
        websites: transformedWebsites,
        total: transformedWebsites.length 
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching websites for workflow selector:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}