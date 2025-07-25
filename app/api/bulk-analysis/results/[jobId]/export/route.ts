import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get all keyword results for completed domains in this job
    const resultsQuery = await db.execute(sql`
      SELECT 
        d.domain,
        kar.keyword,
        kar.position,
        kar.search_volume,
        kar.url,
        kar.cpc,
        kar.competition,
        kar.analysis_date
      FROM bulk_dataforseo_job_items ji
      JOIN bulk_analysis_domains d ON ji.domain_id = d.id
      JOIN keyword_analysis_results kar ON kar.bulk_analysis_domain_id = d.id
      WHERE ji.job_id = ${jobId}::uuid
        AND ji.status = 'completed'
      ORDER BY d.domain, kar.position ASC
    `);

    // Convert to CSV
    const headers = ['Domain', 'Keyword', 'Position', 'Search Volume', 'URL', 'CPC', 'Competition', 'Analysis Date'];
    const csvRows = [headers.join(',')];

    for (const row of resultsQuery.rows as any[]) {
      const csvRow = [
        `"${row.domain}"`,
        `"${row.keyword.replace(/"/g, '""')}"`,
        row.position,
        row.search_volume || '',
        `"${row.url.replace(/"/g, '""')}"`,
        row.cpc ? row.cpc.toFixed(2) : '',
        row.competition || '',
        new Date(row.analysis_date).toISOString().split('T')[0]
      ];
      csvRows.push(csvRow.join(','));
    }

    const csv = csvRows.join('\n');
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bulk-analysis-results-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting bulk analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to export results', details: error.message },
      { status: 500 }
    );
  }
}