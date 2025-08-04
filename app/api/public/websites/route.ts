import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql, and, ilike, gte, lte, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const search = searchParams.get('search');
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const drMin = searchParams.get('drMin') ? parseInt(searchParams.get('drMin')!) : null;
    const drMax = searchParams.get('drMax') ? parseInt(searchParams.get('drMax')!) : null;
    const trafficMin = searchParams.get('trafficMin') ? parseInt(searchParams.get('trafficMin')!) : null;
    const trafficMax = searchParams.get('trafficMax') ? parseInt(searchParams.get('trafficMax')!) : null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(ilike(websites.domain, `%${search}%`));
    }
    
    if (categories && categories.length > 0) {
      // PostgreSQL array overlap operator
      conditions.push(
        sql`${websites.categories} && ARRAY[${sql.join(categories.map(c => sql`${c}`), sql`, `)}]::text[]`
      );
    }
    
    if (drMin !== null) {
      conditions.push(gte(websites.domainRating, drMin));
    }
    
    if (drMax !== null) {
      conditions.push(lte(websites.domainRating, drMax));
    }
    
    if (trafficMin !== null) {
      conditions.push(gte(websites.totalTraffic, trafficMin));
    }
    
    if (trafficMax !== null) {
      conditions.push(lte(websites.totalTraffic, trafficMax));
    }

    // No quality filtering - show all websites

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Execute queries
    const [websiteResults, countResult] = await Promise.all([
      db
        .select({
          id: websites.id,
          domain: websites.domain,
          domainRating: websites.domainRating,
          totalTraffic: websites.totalTraffic,
          guestPostCost: websites.guestPostCost,
          categories: websites.categories,
          overallQuality: websites.overallQuality,
          hasGuestPost: websites.hasGuestPost,
          hasLinkInsert: websites.hasLinkInsert,
        })
        .from(websites)
        .where(whereClause)
        .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(websites)
        .where(whereClause)
    ]);

    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Return public data (no contact info)
    const publicWebsites = websiteResults.map(site => ({
      id: site.id,
      domain: site.domain,
      domainRating: site.domainRating,
      totalTraffic: site.totalTraffic,
      guestPostCost: site.guestPostCost ? parseFloat(site.guestPostCost.toString()) : null,
      categories: site.categories || [],
      overallQuality: site.overallQuality,
      hasGuestPost: site.hasGuestPost,
      hasLinkInsert: site.hasLinkInsert,
    }));

    return NextResponse.json({
      websites: publicWebsites,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      }
    });
  } catch (error) {
    console.error('Public websites API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}