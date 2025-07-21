import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { siteRankings, bulkSites } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { searchParams } = new URL(request.url);
    const topicFilter = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sortBy') || 'rank'; // 'rank', 'volume', 'difficulty'

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    // Get site details
    const site = await db.select().from(bulkSites).where(eq(bulkSites.id, siteId)).limit(1);
    if (!site[0]) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Build query conditions
    let whereConditions = eq(siteRankings.siteId, siteId);
    if (topicFilter) {
      whereConditions = and(whereConditions, eq(siteRankings.topicMatch, topicFilter)) as any;
    }

    // Build order by clause
    let orderByClause;
    switch (sortBy) {
      case 'volume':
        orderByClause = desc(siteRankings.searchVolume);
        break;
      case 'difficulty':
        orderByClause = desc(siteRankings.keywordDifficulty);
        break;
      case 'rank':
      default:
        orderByClause = siteRankings.rankAbsolute;
        break;
    }

    // Get rankings
    const rankings = await db
      .select()
      .from(siteRankings)
      .where(whereConditions)
      .orderBy(orderByClause)
      .limit(Math.min(limit, 1000)); // Cap at 1000 for performance

    // Get unique topic matches for filtering
    const topicMatches = await db
      .selectDistinct({
        topicMatch: siteRankings.topicMatch
      })
      .from(siteRankings)
      .where(eq(siteRankings.siteId, siteId));

    // Calculate ranking distribution
    const rankingDistribution = {
      top10: rankings.filter(r => r.rankAbsolute <= 10).length,
      top20: rankings.filter(r => r.rankAbsolute <= 20).length,
      top50: rankings.filter(r => r.rankAbsolute <= 50).length,
      beyond50: rankings.filter(r => r.rankAbsolute > 50).length
    };

    // Calculate average metrics
    const avgRank = rankings.length > 0 
      ? Math.round(rankings.reduce((sum, r) => sum + r.rankAbsolute, 0) / rankings.length)
      : 0;
    
    const avgVolume = rankings.length > 0
      ? Math.round(rankings.reduce((sum, r) => sum + (r.searchVolume || 0), 0) / rankings.length)
      : 0;

    return NextResponse.json({
      success: true,
      site: {
        id: site[0].id,
        domain: site[0].domain,
        siteName: site[0].siteName,
        totalKeywordsFound: site[0].totalKeywordsFound,
        relevantKeywordsFound: site[0].relevantKeywordsFound
      },
      rankings: rankings.map(ranking => ({
        id: ranking.id,
        keyword: ranking.keyword,
        rankAbsolute: ranking.rankAbsolute,
        searchEngine: ranking.searchEngine,
        keywordDifficulty: ranking.keywordDifficulty,
        searchVolume: ranking.searchVolume,
        cpc: ranking.cpc,
        competitionLevel: ranking.competitionLevel,
        rankingUrl: ranking.rankingUrl,
        topicMatch: ranking.topicMatch,
        collectedAt: ranking.collectedAt
      })),
      metadata: {
        totalResults: rankings.length,
        filters: {
          appliedTopic: topicFilter,
          sortedBy: sortBy
        },
        availableTopics: topicMatches.map(t => t.topicMatch),
        rankingDistribution,
        averageMetrics: {
          avgRank,
          avgVolume,
          totalVolume: rankings.reduce((sum, r) => sum + (r.searchVolume || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Failed to get site rankings:', error);
    return NextResponse.json(
      { error: 'Failed to get site rankings' },
      { status: 500 }
    );
  }
}