import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { domainIds, projectId } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid domain IDs provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to client
    const [project] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        and(
          eq(bulkAnalysisProjects.id, projectId),
          eq(bulkAnalysisProjects.clientId, clientId)
        )
      )
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update domains to assign to project
    const result = await db
      .update(bulkAnalysisDomains)
      .set({
        projectId,
        projectAddedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    // Update project stats
    await db
      .update(bulkAnalysisProjects)
      .set({
        domainCount: sql`(SELECT COUNT(*) FROM ${bulkAnalysisDomains} WHERE ${bulkAnalysisDomains.projectId} = ${projectId})`,
        qualifiedCount: sql`(SELECT COUNT(*) FROM ${bulkAnalysisDomains} WHERE ${bulkAnalysisDomains.projectId} = ${projectId} AND ${bulkAnalysisDomains.qualificationStatus} IN ('high_quality', 'average_quality'))`,
        workflowCount: sql`(SELECT COUNT(*) FROM ${bulkAnalysisDomains} WHERE ${bulkAnalysisDomains.projectId} = ${projectId} AND ${bulkAnalysisDomains.hasWorkflow} = true)`,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(bulkAnalysisProjects.id, projectId));

    return NextResponse.json({
      success: true,
      count: domainIds.length,
      message: `Assigned ${domainIds.length} domains to project`
    });

  } catch (error: any) {
    console.error('Error assigning domains to project:', error);
    return NextResponse.json(
      { error: 'Failed to assign domains', details: error.message },
      { status: 500 }
    );
  }
}