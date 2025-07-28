import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { targetPages } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { AIQualificationService } from '@/lib/services/aiQualificationService';

// Stream progress updates using SSE
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { domainIds } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Starting AI qualification for ${domainIds.length} domains`);

    // Get domains
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    if (domains.length === 0) {
      return NextResponse.json(
        { error: 'No domains found' },
        { status: 404 }
      );
    }

    // Get client's target pages for context
    const clientTargetPages = await db
      .select()
      .from(targetPages)
      .where(
        and(
          eq(targetPages.clientId, clientId),
          eq(targetPages.status, 'active')
        )
      );

    // Get DataForSEO results using raw SQL
    const results = await db.execute(sql`
      SELECT 
        bulk_analysis_domain_id as "domainId",
        keyword,
        position,
        search_volume as "searchVolume",
        url,
        cpc
      FROM keyword_analysis_results
      WHERE bulk_analysis_domain_id = ANY(${sql`ARRAY[${sql.join(domainIds, sql`, `)}]::uuid[]`})
      ORDER BY position ASC, search_volume DESC
    `);

    // Group results by domain
    const resultsByDomain = new Map<string, any[]>();
    (results.rows || []).forEach((result: any) => {
      if (!resultsByDomain.has(result.domainId)) {
        resultsByDomain.set(result.domainId, []);
      }
      resultsByDomain.get(result.domainId)!.push(result);
    });

    // Prepare domain data with keyword rankings
    const domainData = domains.map(domain => {
      const domainResults = resultsByDomain.get(domain.id) || [];
      
      return {
        domainId: domain.id,
        domain: domain.domain,
        keywordRankings: domainResults.map(r => ({
          keyword: r.keyword,
          position: r.position || 100,
          searchVolume: r.searchVolume || 0,
          url: r.url || ''
        }))
      };
    });

    // Prepare client context
    const clientContext = {
      targetPages: clientTargetPages.map(page => ({
        url: page.url,
        keywords: page.keywords ? page.keywords.split(',').map(k => k.trim()) : [],
        description: page.description || undefined
      })),
      clientKeywords: clientTargetPages
        .flatMap(page => page.keywords ? page.keywords.split(',').map(k => k.trim()) : [])
        .filter((v, i, a) => a.indexOf(v) === i) // Unique keywords
    };

    // Run AI qualification with progress tracking
    const aiService = new AIQualificationService();
    let lastProgress = 0;
    
    const qualifications = await aiService.qualifyDomains(
      domainData,
      clientContext,
      (completed, total) => {
        // Progress callback - could be used for SSE in future
        const progress = Math.round((completed / total) * 100);
        if (progress > lastProgress) {
          console.log(`📊 AI Qualification Progress: ${progress}%`);
          lastProgress = progress;
        }
      }
    );

    // Update domains with AI qualifications (including V2 fields)
    const updatePromises = qualifications.map(qual => {
      // Log what we're about to save
      console.log(`💾 Saving V2 data for ${qual.domain}:`, {
        overlapStatus: qual.overlapStatus,
        authorityDirect: qual.authorityDirect,
        authorityRelated: qual.authorityRelated,
        topicScope: qual.topicScope,
        evidence: qual.evidence
      });
      
      // Extract topic reasoning from the main reasoning if present
      const reasoningParts = qual.reasoning.match(/\(b\)\s*(.+)/);
      const topicReasoning = reasoningParts ? reasoningParts[1] : null;
      
      return db
        .update(bulkAnalysisDomains)
        .set({
          qualificationStatus: qual.qualification,
          aiQualificationReasoning: qual.reasoning,
          overlapStatus: qual.overlapStatus,
          authorityDirect: qual.authorityDirect,
          authorityRelated: qual.authorityRelated,
          topicScope: qual.topicScope,
          topicReasoning: topicReasoning,
          evidence: qual.evidence,
          aiQualifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bulkAnalysisDomains.id, qual.domainId));
    });

    await Promise.all(updatePromises);

    console.log(`✅ AI qualification complete for ${qualifications.length} domains`);

    return NextResponse.json({
      success: true,
      qualifications,
      summary: {
        total: qualifications.length,
        highQuality: qualifications.filter(q => q.qualification === 'high_quality').length,
        goodQuality: qualifications.filter(q => q.qualification === 'good_quality').length,
        marginalQuality: qualifications.filter(q => q.qualification === 'marginal_quality').length,
        disqualified: qualifications.filter(q => q.qualification === 'disqualified').length
      }
    });

  } catch (error: any) {
    console.error('AI qualification error:', error);
    return NextResponse.json(
      { error: 'Failed to run AI qualification', details: error.message },
      { status: 500 }
    );
  }
}