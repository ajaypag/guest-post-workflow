import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq } from 'drizzle-orm';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    // Normalize the domain for consistent lookup
    const normalizedDomain = normalizeDomain(domain);

    // Fetch the website with guest post cost
    const website = await db
      .select({
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        hasGuestPost: websites.hasGuestPost,
      })
      .from(websites)
      .where(eq(websites.domain, normalizedDomain.domain))
      .limit(1);

    if (website.length === 0) {
      return NextResponse.json(
        { 
          domain: normalizedDomain.domain,
          guestPostCost: null,
          message: 'Website not found in database' 
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      domain: website[0].domain,
      guestPostCost: website[0].guestPostCost,
      domainRating: website[0].domainRating,
      totalTraffic: website[0].totalTraffic,
      hasGuestPost: website[0].hasGuestPost,
    });
  } catch (error) {
    console.error('Error fetching website cost:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website cost' },
      { status: 500 }
    );
  }
}