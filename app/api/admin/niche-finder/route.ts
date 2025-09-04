import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

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

  try {
    // Build query conditions
    const conditions = [];
    if (needsCheck) {
      const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      conditions.push(`(last_niche_check IS NULL OR last_niche_check < '${cutoffDate.toISOString()}')`);
    }
    
    if (hasNiche === 'yes') {
      conditions.push(`niche IS NOT NULL AND array_length(niche, 1) > 0`);
    } else if (hasNiche === 'no') {
      conditions.push(`(niche IS NULL OR array_length(niche, 1) = 0)`);
    }
    
    if (search) {
      conditions.push(`domain ILIKE '%${search}%'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get websites
    const websitesQuery = sql.raw(`
      SELECT 
        id,
        domain,
        niche,
        categories,
        website_type,
        last_niche_check,
        domain_rating,
        total_traffic,
        suggested_niches,
        suggested_categories,
        niche_confidence
      FROM websites
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN last_niche_check IS NULL THEN 0 
          ELSE 1 
        END,
        last_niche_check ASC NULLS FIRST,
        domain
      LIMIT 100
    `);

    const websitesResult = await db.execute(websitesQuery);
    const websites = (websitesResult as any).rows || [];

    // Get statistics
    const statsQuery = sql.raw(`
      SELECT 
        COUNT(*) as total_websites,
        COUNT(CASE WHEN niche IS NOT NULL AND array_length(niche, 1) > 0 THEN 1 END) as websites_with_niches,
        COUNT(CASE WHEN last_niche_check IS NULL OR last_niche_check < NOW() - INTERVAL '${daysAgo} days' THEN 1 END) as websites_needing_check
      FROM websites
    `);

    const statsResult = await db.execute(statsQuery);
    const basicStats = (statsResult as any).rows[0];

    // Get unique niches count
    const nichesQuery = sql.raw(`
      SELECT COUNT(DISTINCT unnested) as unique_niches
      FROM (
        SELECT unnest(niche) as unnested
        FROM websites
        WHERE niche IS NOT NULL
      ) t
    `);
    const nichesResult = await db.execute(nichesQuery);
    const uniqueNiches = (nichesResult as any).rows[0].unique_niches;

    // Get unique categories count
    const categoriesQuery = sql.raw(`
      SELECT COUNT(DISTINCT unnested) as unique_categories
      FROM (
        SELECT unnest(categories) as unnested
        FROM websites
        WHERE categories IS NOT NULL
      ) t
    `);
    const categoriesResult = await db.execute(categoriesQuery);
    const uniqueCategories = (categoriesResult as any).rows[0].unique_categories;

    // Get suggested tags
    const suggestedTagsQuery = sql.raw(`
      SELECT 
        tag_name as niche,
        tag_type,
        website_count as count,
        example_websites as websites
      FROM suggested_tags
      WHERE approved = false
      ORDER BY website_count DESC
    `);
    const suggestedTagsResult = await db.execute(suggestedTagsQuery);
    const suggestedTags = (suggestedTagsResult as any).rows || [];

    const suggestedNiches = suggestedTags.filter((t: any) => t.tag_type === 'niche');
    const suggestedCategories = suggestedTags.filter((t: any) => t.tag_type === 'category');

    // Get current niches and categories
    const currentNichesQuery = sql.raw(`
      SELECT DISTINCT unnest(niche) as value
      FROM websites
      WHERE niche IS NOT NULL
      ORDER BY value
    `);
    const currentNichesResult = await db.execute(currentNichesQuery);
    const currentNiches = ((currentNichesResult as any).rows || [])
      .map((r: any) => r.value)
      .filter((v: any) => v && v !== '#N/A');

    const currentCategoriesQuery = sql.raw(`
      SELECT DISTINCT unnest(categories) as value
      FROM websites
      WHERE categories IS NOT NULL
      ORDER BY value
    `);
    const currentCategoriesResult = await db.execute(currentCategoriesQuery);
    const currentCategories = ((currentCategoriesResult as any).rows || [])
      .map((r: any) => r.value)
      .filter((v: any) => v && v !== '#N/A');

    return NextResponse.json({
      websites: websites.map((w: any) => ({
        id: w.id,
        domain: w.domain,
        niche: w.niche,
        categories: w.categories,
        websiteType: w.website_type,
        lastNicheCheck: w.last_niche_check,
        domainRating: w.domain_rating,
        totalTraffic: w.total_traffic,
        suggestedNiches: w.suggested_niches,
        suggestedCategories: w.suggested_categories,
        nicheConfidence: w.niche_confidence
      })),
      stats: {
        totalWebsites: parseInt(basicStats.total_websites),
        websitesWithNiches: parseInt(basicStats.websites_with_niches),
        websitesNeedingCheck: parseInt(basicStats.websites_needing_check),
        uniqueNiches: parseInt(uniqueNiches),
        uniqueCategories: parseInt(uniqueCategories),
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