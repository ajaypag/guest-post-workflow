import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { and, gte, lte, isNotNull, eq, sql } from 'drizzle-orm';

// Service fee constant - $79 per link
const SERVICE_FEE_CENTS = 7900;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const drMin = parseInt(searchParams.get('drMin') || '1');
    const drMax = parseInt(searchParams.get('drMax') || '100');
    const minTraffic = parseInt(searchParams.get('minTraffic') || '100');
    const priceMin = parseInt(searchParams.get('priceMin') || '0'); // In cents
    const priceMax = parseInt(searchParams.get('priceMax') || '999999'); // In cents
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const niches = searchParams.get('niches')?.split(',').filter(Boolean) || [];
    const linkCount = parseInt(searchParams.get('linkCount') || '1');

    // Build where conditions
    const conditions = [
      eq(websites.hasGuestPost, true),
      eq(websites.status, 'Active'),
      isNotNull(websites.guestPostCost),
      gte(websites.domainRating, drMin),
      lte(websites.domainRating, drMax)
    ];

    // Add traffic filter
    if (minTraffic > 0) {
      conditions.push(gte(websites.totalTraffic, minTraffic));
    }

    // Add price range filter (guestPostCost is in dollars, convert to cents for comparison)
    if (priceMin > 0) {
      conditions.push(gte(sql`(${websites.guestPostCost}::decimal * 100 + ${SERVICE_FEE_CENTS})`, priceMin));
    }
    if (priceMax < 999999) {
      conditions.push(lte(sql`(${websites.guestPostCost}::decimal * 100 + ${SERVICE_FEE_CENTS})`, priceMax));
    }

    // Add category filter if specified
    if (categories.length > 0) {
      // Use PostgreSQL array overlap operator
      const categoryConditions = categories.map(cat => 
        sql`${websites.categories} && ARRAY[${cat}]::text[]`
      );
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }

    // Add type filter if specified
    if (types.length > 0) {
      const typeConditions = types.map(type => 
        sql`${websites.websiteType} && ARRAY[${type}]::text[]`
      );
      conditions.push(sql`(${sql.join(typeConditions, sql` OR `)})`);
    }

    // Add niche filter if specified
    if (niches.length > 0) {
      const nicheConditions = niches.map(niche => 
        sql`${websites.niche} && ARRAY[${niche}]::text[]`
      );
      conditions.push(sql`(${sql.join(nicheConditions, sql` OR `)})`);
    }

    // Fetch matching websites
    const results = await db
      .select({
        domain: websites.domain,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
        categories: websites.categories,
        websiteType: websites.websiteType,
        niche: websites.niche
      })
      .from(websites)
      .where(and(...conditions))
      .limit(1000); // Limit to prevent huge queries

    if (results.length === 0) {
      return NextResponse.json({
        count: 0,
        wholesaleMedian: 0,
        wholesaleAverage: 0,
        wholesaleMin: 0,
        wholesaleMax: 0,
        clientMedian: 0,
        clientAverage: 0,
        clientMin: 0,
        clientMax: 0,
        examples: []
      });
    }

    // Calculate wholesale prices (convert from decimal to cents)
    const wholesalePrices = results
      .map(r => parseFloat(r.guestPostCost || '0') * 100)
      .filter(p => p > 0)
      .sort((a, b) => a - b);

    // Calculate statistics
    const count = wholesalePrices.length;
    const wholesaleMin = Math.min(...wholesalePrices);
    const wholesaleMax = Math.max(...wholesalePrices);
    const wholesaleAverage = Math.round(wholesalePrices.reduce((a, b) => a + b, 0) / count);
    const wholesaleMedian = count % 2 === 0
      ? Math.round((wholesalePrices[count / 2 - 1] + wholesalePrices[count / 2]) / 2)
      : wholesalePrices[Math.floor(count / 2)];

    // Calculate client prices (wholesale + service fee)
    const clientMin = wholesaleMin + SERVICE_FEE_CENTS;
    const clientMax = wholesaleMax + SERVICE_FEE_CENTS;
    const clientAverage = wholesaleAverage + SERVICE_FEE_CENTS;
    const clientMedian = wholesaleMedian + SERVICE_FEE_CENTS;

    // Get example sites (top 5 by DR)
    const examples = results
      .sort((a, b) => (b.domainRating || 0) - (a.domainRating || 0))
      .slice(0, 5)
      .map(site => ({
        domain: site.domain,
        dr: site.domainRating || 0,
        traffic: site.totalTraffic || 0,
        wholesalePrice: Math.round(parseFloat(site.guestPostCost || '0') * 100),
        clientPrice: Math.round(parseFloat(site.guestPostCost || '0') * 100) + SERVICE_FEE_CENTS
      }));

    return NextResponse.json({
      count,
      wholesaleMedian,
      wholesaleAverage,
      wholesaleMin,
      wholesaleMax,
      clientMedian,
      clientAverage,
      clientMin,
      clientMax,
      examples
    });

  } catch (error) {
    console.error('Error estimating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to estimate pricing' },
      { status: 500 }
    );
  }
}