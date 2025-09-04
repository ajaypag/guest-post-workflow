import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { eq, and, or, isNull, count, sql, lt, ilike } from 'drizzle-orm';
import { websites } from '@/lib/db/websiteSchema';
import { suggestedTags } from '@/lib/db/nichesSchema';

export async function GET(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }
  
  console.log('🔍 Niche finder API called');

  const searchParams = request.nextUrl.searchParams;
  const needsCheck = searchParams.get('needsCheck') === 'true';
  const hasNiche = searchParams.get('hasNiche') || 'all';
  const daysAgo = parseInt(searchParams.get('daysAgo') || '30');
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  try {
    // Build query conditions using Drizzle ORM
    const conditions = [];
    
    if (needsCheck) {
      const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      conditions.push(
        or(
          isNull(websites.lastNicheCheck),
          lt(websites.lastNicheCheck, cutoffDate)
        )
      );
    }
    
    if (hasNiche === 'yes') {
      conditions.push(
        and(
          sql`${websites.niche} IS NOT NULL`,
          sql`array_length(${websites.niche}, 1) > 0`
        )
      );
    } else if (hasNiche === 'no') {
      conditions.push(
        or(
          isNull(websites.niche),
          sql`array_length(${websites.niche}, 1) = 0`
        )
      );
    }
    
    if (search) {
      conditions.push(ilike(websites.domain, `%${search}%`));
    }

    // Build final WHERE condition
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get websites using Drizzle ORM
    const websitesResult = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        niche: websites.niche,
        categories: websites.categories,
        websiteType: websites.websiteType,
        lastNicheCheck: websites.lastNicheCheck,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        suggestedNiches: websites.suggestedNiches,
        suggestedCategories: websites.suggestedCategories,
      })
      .from(websites)
      .where(whereCondition)
      .orderBy(
        sql`CASE WHEN ${websites.lastNicheCheck} IS NULL THEN 0 ELSE 1 END`,
        websites.lastNicheCheck,
        websites.domain
      )
      .limit(limit)
      .offset(offset);

    const websitesList = websitesResult;

    // Get statistics using Drizzle ORM
    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const statsResult = await db
      .select({
        totalWebsites: count(),
        websitesWithNiches: count(sql`CASE WHEN ${websites.niche} IS NOT NULL AND array_length(${websites.niche}, 1) > 0 THEN 1 END`),
        websitesNeedingCheck: count(sql`CASE WHEN ${websites.lastNicheCheck} IS NULL OR ${websites.lastNicheCheck} < ${cutoffDate} THEN 1 END`)
      })
      .from(websites);
    
    const basicStats = statsResult[0];

    // Get unique niches count using Drizzle ORM  
    const uniqueNichesResult = await db
      .select({
        uniqueNiches: count(sql`DISTINCT unnested`)
      })
      .from(
        sql`(
          SELECT unnest(${websites.niche}) as unnested
          FROM ${websites}
          WHERE ${websites.niche} IS NOT NULL
        ) t`
      );
    
    const uniqueNiches = uniqueNichesResult[0]?.uniqueNiches || 0;

    // Get unique categories count using Drizzle ORM
    const uniqueCategoriesResult = await db
      .select({
        uniqueCategories: count(sql`DISTINCT unnested`)
      })
      .from(
        sql`(
          SELECT unnest(${websites.categories}) as unnested
          FROM ${websites}
          WHERE ${websites.categories} IS NOT NULL
        ) t`
      );
    
    const uniqueCategories = uniqueCategoriesResult[0]?.uniqueCategories || 0;

    // Get suggested tags using Drizzle ORM
    const suggestedTagsResult = await db
      .select({
        id: suggestedTags.id,
        niche: suggestedTags.tagName,
        tagType: suggestedTags.tagType,
        count: suggestedTags.websiteCount,
        websites: suggestedTags.exampleWebsites
      })
      .from(suggestedTags)
      .where(eq(suggestedTags.approved, false))
      .orderBy(suggestedTags.websiteCount);

    const suggestedTagsList = suggestedTagsResult;
    const suggestedNiches = suggestedTagsList.filter((t: any) => t.tagType === 'niche');
    const suggestedCategories = suggestedTagsList.filter((t: any) => t.tagType === 'category');

    // Get current niches using Drizzle ORM
    const currentNichesResult = await db
      .select({
        value: sql`DISTINCT unnest(${websites.niche})`
      })
      .from(websites)
      .where(sql`${websites.niche} IS NOT NULL`)
      .orderBy(sql`unnest(${websites.niche})`);

    const currentNiches = currentNichesResult
      .map((r: any) => r.value)
      .filter((v: any) => v && v !== '#N/A');

    // Get current categories using Drizzle ORM
    const currentCategoriesResult = await db
      .select({
        value: sql`DISTINCT unnest(${websites.categories})`
      })
      .from(websites)
      .where(sql`${websites.categories} IS NOT NULL`)
      .orderBy(sql`unnest(${websites.categories})`);

    const currentCategories = currentCategoriesResult
      .map((r: any) => r.value)
      .filter((v: any) => v && v !== '#N/A');

    return NextResponse.json({
      websites: websitesList.map((w: any) => ({
        id: w.id,
        domain: w.domain,
        niche: w.niche,
        categories: w.categories,
        websiteType: w.websiteType,
        lastNicheCheck: w.lastNicheCheck,
        domainRating: w.domainRating,
        totalTraffic: w.totalTraffic,
        suggestedNiches: w.suggestedNiches,
        suggestedCategories: w.suggestedCategories,
      })),
      stats: {
        totalWebsites: Number(basicStats.totalWebsites),
        websitesWithNiches: Number(basicStats.websitesWithNiches),
        websitesNeedingCheck: Number(basicStats.websitesNeedingCheck),
        uniqueNiches: Number(uniqueNiches),
        uniqueCategories: Number(uniqueCategories),
        suggestedNiches,
        suggestedCategories
      },
      currentNiches,
      currentCategories
    });
  } catch (error) {
    console.error('Error fetching niche finder data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}