import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Check if keywords have been searched for this domain
    const searchHistoryResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT keyword) as keywords_analyzed,
        COUNT(DISTINCT CASE WHEN has_results = true THEN keyword END) as keywords_with_results,
        MAX(searched_at) as last_analyzed
      FROM keyword_search_history
      WHERE bulk_analysis_domain_id = ${domainId}::uuid
    `);

    const searchHistory = searchHistoryResult.rows[0] as any;
    const keywordsAnalyzed = Number(searchHistory?.keywords_analyzed || 0);
    const keywordsWithResults = Number(searchHistory?.keywords_with_results || 0);

    // Get the actual searched keywords list
    const keywordsResult = await db.execute(sql`
      SELECT DISTINCT keyword
      FROM keyword_search_history
      WHERE bulk_analysis_domain_id = ${domainId}::uuid
      ORDER BY keyword
    `);

    const searchedKeywords = keywordsResult.rows.map((r: any) => r.keyword);

    return NextResponse.json({ 
      wasAnalyzed: keywordsAnalyzed > 0,
      keywordsAnalyzed,
      keywordsWithResults,
      lastAnalyzed: searchHistory?.last_analyzed,
      searchedKeywords,
      hasNoResults: keywordsAnalyzed > 0 && keywordsWithResults === 0
    });
  } catch (error: any) {
    console.error('Error checking DataForSEO analysis status:', error);
    return NextResponse.json(
      { error: 'Failed to check analysis status', details: error.message },
      { status: 500 }
    );
  }
}