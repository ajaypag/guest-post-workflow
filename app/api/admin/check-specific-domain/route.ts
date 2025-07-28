import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { like, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || 'indeedseo.com';
    
    // Find the domain
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(like(bulkAnalysisDomains.domain, `%${domain}%`))
      .orderBy(desc(bulkAnalysisDomains.aiQualifiedAt))
      .limit(5);

    if (domains.length === 0) {
      return NextResponse.json({ error: 'Domain not found' });
    }

    // Return detailed info about the domain
    return NextResponse.json({
      found: domains.length,
      domains: domains.map(d => ({
        id: d.id,
        domain: d.domain,
        qualificationStatus: d.qualificationStatus,
        aiQualifiedAt: d.aiQualifiedAt,
        // V2 fields
        overlapStatus: d.overlapStatus,
        authorityDirect: d.authorityDirect,
        authorityRelated: d.authorityRelated,
        topicScope: d.topicScope,
        topicReasoning: d.topicReasoning,
        evidence: d.evidence,
        // Check if V2 data exists
        hasV2Data: !!(d.overlapStatus || d.authorityDirect || d.authorityRelated || d.topicScope),
        // AI reasoning
        aiQualificationReasoning: d.aiQualificationReasoning?.substring(0, 200) + '...'
      }))
    });
  } catch (error: any) {
    console.error('Error checking domain:', error);
    return NextResponse.json(
      { error: 'Failed to check domain', details: error.message },
      { status: 500 }
    );
  }
}