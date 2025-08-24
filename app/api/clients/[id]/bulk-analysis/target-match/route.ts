import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { AIQualificationService } from '@/lib/services/aiQualificationService';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * POST /api/clients/[id]/bulk-analysis/target-match
 * Run target URL matching for qualified domains
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await context.params;
    const { domainIds: requestedDomainIds, projectId } = await request.json();

    console.log(`🎯 Starting target URL matching for client ${clientId}`);
    console.log(`Domain IDs provided: ${requestedDomainIds?.length || 'all qualified'}`);
    console.log(`Project ID: ${projectId || 'not specified'}`);

    // Get qualified domains only
    const domains = await getQualifiedDomains(clientId, requestedDomainIds, projectId);
    
    if (domains.length === 0) {
      return NextResponse.json({ 
        error: 'No qualified domains found',
        details: 'Only domains with high_quality or good_quality qualification can be matched to target URLs'
      }, { status: 400 });
    }

    console.log(`Found ${domains.length} qualified domains for target matching`);

    // Get client context (target pages and keywords)
    const clientContext = await getClientContext(clientId);
    
    if (!clientContext.targetPages || clientContext.targetPages.length === 0) {
      return NextResponse.json({ 
        error: 'No target pages found for client',
        details: 'Please add target pages to the client before running target URL matching'
      }, { status: 400 });
    }

    console.log(`Client has ${clientContext.targetPages.length} target pages`);
    
    // Get keyword rankings for the domains
    const domainIds = domains.map(d => d.id);
    const keywordResults = await db.execute(sql`
      SELECT 
        bulk_analysis_domain_id as "domainId",
        keyword,
        position,
        search_volume as "searchVolume",
        url
      FROM keyword_analysis_results
      WHERE bulk_analysis_domain_id = ANY(${sql`ARRAY[${sql.join(domainIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[]`})
      ORDER BY position ASC, search_volume DESC
    `);
    
    // Group keyword rankings by domain
    const keywordsByDomain = new Map<string, any[]>();
    (keywordResults.rows || []).forEach((result: any) => {
      if (!keywordsByDomain.has(result.domainId)) {
        keywordsByDomain.set(result.domainId, []);
      }
      keywordsByDomain.get(result.domainId)!.push({
        keyword: result.keyword,
        position: result.position || 100,
        searchVolume: result.searchVolume || 0,
        url: result.url || ''
      });
    });
    
    // Run target matching using AI service
    const aiService = new AIQualificationService();
    const targetMatches = await aiService.matchTargetUrls(
      domains.map(d => ({
        domain: {
          domainId: d.id,
          domain: d.domain,
          keywordRankings: keywordsByDomain.get(d.id) || []
        },
        qualification: {
          domainId: d.id,
          domain: d.domain,
          qualification: d.qualificationStatus as 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified',
          reasoning: d.aiQualificationReasoning || '',
          overlapStatus: (d.overlapStatus || 'none') as 'direct' | 'related' | 'both' | 'none',
          authorityDirect: (d.authorityDirect || 'n/a') as 'strong' | 'moderate' | 'weak' | 'n/a',
          authorityRelated: (d.authorityRelated || 'n/a') as 'strong' | 'moderate' | 'weak' | 'n/a',
          topicScope: (d.topicScope || 'long_tail') as 'short_tail' | 'long_tail' | 'ultra_long_tail',
          evidence: (d.evidence as any) || {
            direct_count: 0,
            direct_median_position: null,
            related_count: 0,
            related_median_position: null
          }
        }
      })),
      clientContext,
      (completed, total) => {
        console.log(`🎯 Target matching progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`);
      }
    );
    
    console.log(`✅ Generated ${targetMatches.length} target matches`);
    
    // Update database with target matching results
    const updateResults = await updateDomainsWithTargetMatches(targetMatches);
    
    // Return summary
    const summary = {
      success: true,
      totalQualified: domains.length,
      totalMatched: targetMatches.length,
      matchDistribution: getMatchDistribution(targetMatches),
      targetPageCoverage: getTargetPageCoverage(targetMatches, clientContext.targetPages),
      updatedDomains: updateResults.updated,
      failedUpdates: updateResults.failed
    };

    console.log('🎯 Target matching complete:', summary);
    
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error('Error in target URL matching:', error);
    return NextResponse.json(
      { 
        error: 'Failed to match target URLs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get qualified domains for target matching
 */
async function getQualifiedDomains(
  clientId: string, 
  domainIds?: string[],
  projectId?: string
) {
  const conditions = [
    eq(bulkAnalysisDomains.clientId, clientId),
    inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
  ];

  if (projectId) {
    conditions.push(eq(bulkAnalysisDomains.projectId, projectId));
  }

  if (domainIds && domainIds.length > 0) {
    conditions.push(inArray(bulkAnalysisDomains.id, domainIds));
  }

  // Only get domains that haven't been target matched yet (or optionally re-match)
  // Commenting out to allow re-matching: conditions.push(isNull(bulkAnalysisDomains.suggestedTargetUrl));

  const domains = await db.query.bulkAnalysisDomains.findMany({
    where: and(...conditions),
    limit: 100 // Process max 100 at a time to avoid timeouts
  });

  return domains;
}

/**
 * Get client context for target matching
 */
async function getClientContext(clientId: string) {
  // Get client with target pages
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    with: {
      targetPages: true
    }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Format target pages with keywords
  const targetPagesWithKeywords = client.targetPages.map(page => ({
    url: page.url,
    keywords: Array.isArray(page.keywords) ? page.keywords : (page.keywords ? [page.keywords] : []),
    description: page.description || ''
  }));

  // Collect all client keywords (from narrow to broad)
  const allKeywords = new Set<string>();
  targetPagesWithKeywords.forEach(page => {
    page.keywords.forEach(keyword => allKeywords.add(keyword));
  });

  return {
    targetPages: targetPagesWithKeywords,
    clientKeywords: Array.from(allKeywords)
  };
}

/**
 * Update domains with target matching results
 */
async function updateDomainsWithTargetMatches(targetMatches: any[]) {
  const updated: string[] = [];
  const failed: string[] = [];

  for (const match of targetMatches) {
    try {
      await db
        .update(bulkAnalysisDomains)
        .set({
          suggestedTargetUrl: match.best_target_url,
          targetMatchData: match,
          targetMatchedAt: new Date()
        })
        .where(eq(bulkAnalysisDomains.id, match.domainId));
      
      updated.push(match.domainId);
    } catch (error) {
      console.error(`Failed to update domain ${match.domainId}:`, error);
      failed.push(match.domainId);
    }
  }

  return { updated, failed };
}

/**
 * Get match quality distribution
 */
function getMatchDistribution(targetMatches: any[]) {
  const distribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0
  };

  targetMatches.forEach(match => {
    match.target_analysis?.forEach((analysis: any) => {
      const quality = analysis.match_quality;
      if (quality in distribution) {
        distribution[quality as keyof typeof distribution]++;
      }
    });
  });

  return distribution;
}

/**
 * Get target page coverage
 */
function getTargetPageCoverage(targetMatches: any[], targetPages: any[]) {
  const coverage = new Map<string, number>();
  
  targetPages.forEach(page => {
    coverage.set(page.url, 0);
  });

  targetMatches.forEach(match => {
    if (match.best_target_url && coverage.has(match.best_target_url)) {
      coverage.set(match.best_target_url, (coverage.get(match.best_target_url) || 0) + 1);
    }
  });

  return Array.from(coverage.entries()).map(([url, count]) => ({
    url,
    assignedDomains: count
  }));
}