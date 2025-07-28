import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const clientId = searchParams.get('clientId');

    // Get all domains with their DataForSEO status
    const conditions = [];
    if (projectId) {
      conditions.push(eq(bulkAnalysisDomains.projectId, projectId));
    } else if (clientId) {
      conditions.push(eq(bulkAnalysisDomains.clientId, clientId));
    }

    const domains = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        projectId: bulkAnalysisDomains.projectId,
        hasDataForSeoResults: bulkAnalysisDomains.hasDataForSeoResults,
        dataForSeoLastAnalyzed: bulkAnalysisDomains.dataForSeoLastAnalyzed,
        dataForSeoResultsCount: bulkAnalysisDomains.dataForSeoResultsCount,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
      })
      .from(bulkAnalysisDomains)
      .where(conditions.length > 0 ? conditions[0] : undefined);

    // Count domains by DataForSEO status
    const stats = {
      total: domains.length,
      analyzed: domains.filter(d => d.hasDataForSeoResults === true).length,
      notAnalyzed: domains.filter(d => d.hasDataForSeoResults === false).length,
      nullStatus: domains.filter(d => d.hasDataForSeoResults === null).length,
    };

    // Get project-level counts if projectId is provided
    let projectStats = null;
    if (projectId) {
      const [project] = await db
        .select({
          id: bulkAnalysisProjects.id,
          name: bulkAnalysisProjects.name,
          analyzedCount: sql<number>`
            (SELECT COUNT(*) FROM ${bulkAnalysisDomains} 
             WHERE ${bulkAnalysisDomains.projectId} = ${bulkAnalysisProjects.id} 
             AND ${bulkAnalysisDomains.hasDataForSeoResults} = true)
          `.as('analyzedCount'),
          analyzedCountAlt: sql<number>`
            (SELECT COUNT(*) FROM ${bulkAnalysisDomains} 
             WHERE project_id = ${projectId} 
             AND has_dataforseo_results = true)
          `.as('analyzedCountAlt'),
        })
        .from(bulkAnalysisProjects)
        .where(eq(bulkAnalysisProjects.id, projectId));

      projectStats = project;
    }

    // Sample of domains with their status
    const domainSample = domains.slice(0, 10).map(d => ({
      domain: d.domain,
      hasDataForSeoResults: d.hasDataForSeoResults,
      dataForSeoLastAnalyzed: d.dataForSeoLastAnalyzed,
      dataForSeoResultsCount: d.dataForSeoResultsCount,
    }));

    return NextResponse.json({
      success: true,
      stats,
      projectStats,
      domainSample,
      debug: {
        totalDomains: domains.length,
        domainsWithTrueStatus: domains.filter(d => d.hasDataForSeoResults === true).map(d => d.domain),
        domainsWithFalseStatus: domains.filter(d => d.hasDataForSeoResults === false).length,
        domainsWithNullStatus: domains.filter(d => d.hasDataForSeoResults === null).length,
        recentlyAnalyzed: domains
          .filter(d => d.dataForSeoLastAnalyzed)
          .sort((a, b) => new Date(b.dataForSeoLastAnalyzed!).getTime() - new Date(a.dataForSeoLastAnalyzed!).getTime())
          .slice(0, 5)
          .map(d => ({
            domain: d.domain,
            analyzedAt: d.dataForSeoLastAnalyzed,
            hasResults: d.hasDataForSeoResults,
            resultsCount: d.dataForSeoResultsCount,
          })),
      },
    });
  } catch (error: any) {
    console.error('Debug analyzed count error:', error);
    return NextResponse.json(
      { error: 'Failed to debug analyzed count', details: error.message },
      { status: 500 }
    );
  }
}