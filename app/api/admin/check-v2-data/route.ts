import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if V2 columns exist
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name IN ('overlap_status', 'authority_direct', 'authority_related', 'topic_scope', 'topic_reasoning', 'evidence')
    `);

    const columnsExist = columnCheck.rows.length === 6;

    // Get stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(CASE WHEN overlap_status IS NOT NULL THEN 1 END) as with_overlap_status,
        COUNT(CASE WHEN authority_direct IS NOT NULL THEN 1 END) as with_authority_direct,
        COUNT(CASE WHEN authority_related IS NOT NULL THEN 1 END) as with_authority_related,
        COUNT(CASE WHEN topic_scope IS NOT NULL THEN 1 END) as with_topic_scope,
        COUNT(CASE WHEN evidence IS NOT NULL THEN 1 END) as with_evidence
      FROM bulk_analysis_domains
    `);

    // Get sample domains with V2 data
    const sampleDomains = await db.execute(sql`
      SELECT 
        id,
        domain,
        qualification_status,
        overlap_status,
        authority_direct,
        authority_related,
        topic_scope,
        ai_qualified_at
      FROM bulk_analysis_domains
      WHERE overlap_status IS NOT NULL
      OR authority_direct IS NOT NULL
      OR authority_related IS NOT NULL
      OR topic_scope IS NOT NULL
      LIMIT 5
    `);

    const statsRow = stats.rows[0] as any;
    const domainsWithV2Data = Math.max(
      statsRow.with_overlap_status || 0,
      statsRow.with_authority_direct || 0,
      statsRow.with_authority_related || 0,
      statsRow.with_topic_scope || 0
    );

    return NextResponse.json({
      columnsExist,
      totalDomains: parseInt(statsRow.total_domains || '0'),
      domainsWithV2Data,
      withOverlapStatus: parseInt(statsRow.with_overlap_status || '0'),
      withAuthorityData: parseInt(statsRow.with_authority_direct || '0'),
      withTopicScope: parseInt(statsRow.with_topic_scope || '0'),
      sampleDomains: sampleDomains.rows.map(row => ({
        domain: row.domain,
        qualificationStatus: row.qualification_status,
        overlapStatus: row.overlap_status,
        authorityDirect: row.authority_direct,
        authorityRelated: row.authority_related,
        topicScope: row.topic_scope,
        aiQualifiedAt: row.ai_qualified_at
      }))
    });
  } catch (error: any) {
    console.error('Error checking V2 data:', error);
    return NextResponse.json(
      { error: 'Failed to check V2 data', details: error.message },
      { status: 500 }
    );
  }
}