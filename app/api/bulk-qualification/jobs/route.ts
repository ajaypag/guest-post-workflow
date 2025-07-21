import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { qualificationJobs, clients, bulkSites } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where conditions
    let whereConditions: any = undefined;
    if (clientId && status) {
      whereConditions = sql`${qualificationJobs.clientId} = ${clientId} AND ${qualificationJobs.status} = ${status}`;
    } else if (clientId) {
      whereConditions = eq(qualificationJobs.clientId, clientId);
    } else if (status) {
      whereConditions = eq(qualificationJobs.status, status);
    }

    // Get jobs with client info and site counts
    const jobsQuery = db
      .select({
        job: qualificationJobs,
        client: clients,
        completedSitesCount: sql<number>`count(case when ${bulkSites.status} = 'analyzed' then 1 end)`.as('completedSitesCount'),
        errorSitesCount: sql<number>`count(case when ${bulkSites.status} = 'error' then 1 end)`.as('errorSitesCount')
      })
      .from(qualificationJobs)
      .leftJoin(clients, eq(qualificationJobs.clientId, clients.id))
      .leftJoin(bulkSites, eq(qualificationJobs.id, bulkSites.jobId))
      .groupBy(qualificationJobs.id, clients.id)
      .orderBy(desc(qualificationJobs.createdAt))
      .limit(limit)
      .offset(offset);

    if (whereConditions) {
      jobsQuery.where(whereConditions);
    }

    const jobs = await jobsQuery;

    // Get total count for pagination
    const totalCountQuery = db
      .select({
        count: sql<number>`count(*)`.as('count')
      })
      .from(qualificationJobs);

    if (whereConditions) {
      totalCountQuery.where(whereConditions);
    }

    const totalCount = await totalCountQuery;

    return NextResponse.json({
      success: true,
      jobs: jobs.map(({ job, client, completedSitesCount, errorSitesCount }) => ({
        id: job.id,
        name: job.name,
        description: job.description,
        status: job.status,
        checkDepth: job.checkDepth,
        totalSites: job.totalSites,
        processedSites: job.processedSites,
        completedSites: Number(completedSitesCount),
        errorSites: Number(errorSitesCount),
        totalApiCalls: job.totalApiCalls,
        estimatedCost: job.estimatedCost,
        qualifiedSitesCount: job.qualifiedSitesCount,
        averageRelevanceScore: job.averageRelevanceScore,
        client: client ? {
          id: client.id,
          name: client.name,
          website: client.website
        } : null,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        progressPercentage: job.totalSites > 0 
          ? Math.round(((job.processedSites || 0) / job.totalSites) * 100)
          : 0
      })),
      pagination: {
        total: Number(totalCount[0]?.count || 0),
        limit,
        offset,
        hasMore: (Number(totalCount[0]?.count || 0)) > (offset + limit)
      }
    });

  } catch (error) {
    console.error('Failed to get qualification jobs:', error);
    return NextResponse.json(
      { error: 'Failed to get qualification jobs' },
      { status: 500 }
    );
  }
}