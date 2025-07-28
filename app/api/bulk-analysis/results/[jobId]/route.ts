import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get job items with their domain info
    const jobItemsResult = await db.execute(sql`
      SELECT 
        ji.domain_id,
        d.domain,
        ji.keywords_analyzed,
        ji.rankings_found,
        ji.status,
        ji.error_message
      FROM bulk_dataforseo_job_items ji
      JOIN bulk_analysis_domains d ON ji.domain_id = d.id
      WHERE ji.job_id = ${jobId}::uuid
        AND ji.status = 'completed'
    `);

    const results = [];

    // For each completed domain, get detailed keyword data
    for (const item of jobItemsResult.rows as any[]) {
      // Get keyword analysis results
      const keywordResults = await db.execute(sql`
        SELECT 
          keyword,
          position,
          search_volume,
          url,
          cpc,
          competition
        FROM keyword_analysis_results
        WHERE bulk_analysis_domain_id = ${item.domain_id}::uuid
        ORDER BY position ASC
        LIMIT 100
      `);

      // Calculate metrics
      let totalSearchVolume = 0;
      let totalCpc = 0;
      let cpcCount = 0;
      let totalPosition = 0;
      
      const topKeywords = keywordResults.rows.map((k: any) => {
        if (k.search_volume != null) totalSearchVolume += k.search_volume;
        if (k.cpc != null) {
          totalCpc += parseFloat(k.cpc);
          cpcCount++;
        }
        totalPosition += k.position || 0;
        
        return {
          keyword: k.keyword,
          position: k.position || 0,
          searchVolume: k.search_volume || 0,
          cpc: k.cpc != null ? parseFloat(k.cpc) : null,
          url: k.url || ''
        };
      });

      results.push({
        domainId: item.domain_id,
        domain: item.domain,
        keywordsAnalyzed: item.keywords_analyzed || 0,
        rankingsFound: item.rankings_found || 0,
        avgPosition: keywordResults.rows.length > 0 ? totalPosition / keywordResults.rows.length : 0,
        totalSearchVolume,
        avgCpc: cpcCount > 0 ? totalCpc / cpcCount : 0,
        topKeywords: topKeywords.slice(0, 10) // Top 10 keywords
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error fetching bulk analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results', details: error.message },
      { status: 500 }
    );
  }
}