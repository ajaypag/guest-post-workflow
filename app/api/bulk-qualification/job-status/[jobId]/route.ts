import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { qualificationJobs, bulkSites, siteRankings } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job details
    const job = await db.select().from(qualificationJobs).where(eq(qualificationJobs.id, jobId)).limit(1);
    if (!job[0]) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = job[0];

    // Get site processing statistics
    const siteStats = await db
      .select({
        status: bulkSites.status,
        count: sql<number>`count(*)`.as('count')
      })
      .from(bulkSites)
      .where(eq(bulkSites.jobId, jobId))
      .groupBy(bulkSites.status);

    // Convert to object for easier access
    const statusCounts = siteStats.reduce((acc, stat) => {
      acc[stat.status] = Number(stat.count);
      return acc;
    }, {} as Record<string, number>);

    // Get total rankings collected
    const rankingsCount = await db
      .select({
        count: sql<number>`count(*)`.as('count')
      })
      .from(siteRankings)
      .where(eq(siteRankings.jobId, jobId));

    const totalRankings = Number(rankingsCount[0]?.count || 0);

    // Get sites with their ranking counts
    const sitesWithRankings = await db
      .select({
        site: bulkSites,
        rankingCount: sql<number>`count(${siteRankings.id})`.as('rankingCount')
      })
      .from(bulkSites)
      .leftJoin(siteRankings, eq(bulkSites.id, siteRankings.siteId))
      .where(eq(bulkSites.jobId, jobId))
      .groupBy(bulkSites.id)
      .orderBy(bulkSites.createdAt);

    // Calculate progress percentage
    const totalSites = jobData.totalSites;
    const processedSites = jobData.processedSites || 0;
    const progressPercentage = totalSites > 0 ? Math.round((processedSites / totalSites) * 100) : 0;

    return NextResponse.json({
      success: true,
      job: {
        id: jobData.id,
        name: jobData.name,
        status: jobData.status,
        totalSites: jobData.totalSites,
        processedSites: jobData.processedSites || 0,
        totalApiCalls: jobData.totalApiCalls || 0,
        estimatedCost: jobData.estimatedCost,
        progressPercentage,
        startedAt: jobData.startedAt,
        completedAt: jobData.completedAt,
        createdAt: jobData.createdAt
      },
      statistics: {
        siteStatusCounts: {
          pending: statusCounts.pending || 0,
          checking: statusCounts.checking || 0,
          analyzed: statusCounts.analyzed || 0,
          error: statusCounts.error || 0
        },
        totalRankingsCollected: totalRankings,
        averageRankingsPerSite: totalSites > 0 ? Math.round(totalRankings / totalSites) : 0
      },
      sites: sitesWithRankings.map(({ site, rankingCount }) => ({
        id: site.id,
        domain: site.domain,
        siteName: site.siteName,
        status: site.status,
        totalKeywordsFound: site.totalKeywordsFound,
        relevantKeywordsFound: site.relevantKeywordsFound,
        rankingCount: Number(rankingCount),
        errorMessage: site.errorMessage,
        checkedAt: site.checkedAt
      }))
    });

  } catch (error) {
    console.error('Failed to get job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}