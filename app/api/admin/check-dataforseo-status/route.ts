import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get counts
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(CASE WHEN has_dataforseo_results = true THEN 1 END) as analyzed_count,
        COUNT(CASE WHEN dataforseo_status = 'analyzed' THEN 1 END) as status_analyzed_count,
        COUNT(CASE WHEN dataforseo_results_count > 0 THEN 1 END) as has_results_count,
        COUNT(CASE WHEN dataforseo_last_analyzed IS NOT NULL THEN 1 END) as has_date_count
      FROM bulk_analysis_domains
    `);

    // Get sample of analyzed domains
    const analyzed = await db.execute(sql`
      SELECT 
        id,
        domain,
        has_dataforseo_results,
        dataforseo_status,
        dataforseo_results_count,
        dataforseo_last_analyzed,
        updated_at
      FROM bulk_analysis_domains
      WHERE dataforseo_last_analyzed IS NOT NULL
      ORDER BY dataforseo_last_analyzed DESC
      LIMIT 10
    `);

    // Get sample of domains that should be analyzed but aren't marked
    const shouldBeAnalyzed = await db.execute(sql`
      SELECT 
        d.id,
        d.domain,
        d.has_dataforseo_results,
        d.dataforseo_status,
        d.dataforseo_results_count,
        COUNT(kar.id) as actual_results_count
      FROM bulk_analysis_domains d
      LEFT JOIN keyword_analysis_results kar ON kar.bulk_analysis_domain_id = d.id
      WHERE d.has_dataforseo_results = false
      GROUP BY d.id, d.domain, d.has_dataforseo_results, d.dataforseo_status, d.dataforseo_results_count
      HAVING COUNT(kar.id) > 0
      LIMIT 10
    `);

    return NextResponse.json({
      summary: result.rows[0],
      analyzed_domains: analyzed.rows,
      domains_with_results_but_not_marked: shouldBeAnalyzed.rows
    });
  } catch (error: any) {
    console.error('Error checking DataForSEO status:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    );
  }
}