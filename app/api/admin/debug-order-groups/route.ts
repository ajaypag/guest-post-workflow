import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { orders } from '@/lib/db/orderSchema';
import { isNotNull, isNull, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get counts
    const totalOrderGroups = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderGroups)
      .then(r => r[0]?.count || 0);

    const groupsWithProject = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId))
      .then(r => r[0]?.count || 0);

    const groupsWithoutProject = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderGroups)
      .where(isNull(orderGroups.bulkAnalysisProjectId))
      .then(r => r[0]?.count || 0);

    // Get sample order groups
    const sampleGroupsWithProject = await db
      .select({
        id: orderGroups.id,
        orderId: orderGroups.orderId,
        clientId: orderGroups.clientId,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
        status: orderGroups.status,
        createdAt: orderGroups.createdAt,
      })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId))
      .limit(5);

    const sampleGroupsWithoutProject = await db
      .select({
        id: orderGroups.id,
        orderId: orderGroups.orderId,
        clientId: orderGroups.clientId,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
        status: orderGroups.status,
        createdAt: orderGroups.createdAt,
      })
      .from(orderGroups)
      .where(isNull(orderGroups.bulkAnalysisProjectId))
      .limit(5);

    // Check if bulk_analysis_projects table has data
    const totalProjects = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bulkAnalysisProjects)
      .then(r => r[0]?.count || 0);

    // Check for orphaned project references
    const orphanedProjectRefs = await db
      .select({
        orderGroupId: orderGroups.id,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
      })
      .from(orderGroups)
      .leftJoin(
        bulkAnalysisProjects,
        eq(orderGroups.bulkAnalysisProjectId, bulkAnalysisProjects.id)
      )
      .where(
        and(
          isNotNull(orderGroups.bulkAnalysisProjectId),
          isNull(bulkAnalysisProjects.id)
        )
      );

    return NextResponse.json({
      summary: {
        totalOrderGroups,
        groupsWithProject,
        groupsWithoutProject,
        totalBulkAnalysisProjects: totalProjects,
        orphanedProjectReferences: orphanedProjectRefs.length,
      },
      samples: {
        withProject: sampleGroupsWithProject,
        withoutProject: sampleGroupsWithoutProject,
      },
      orphanedRefs: orphanedProjectRefs,
      debug: {
        message: 'Order groups need bulkAnalysisProjectId to be migrated',
        migrationReady: groupsWithProject > 0,
      }
    });
  } catch (error) {
    console.error('Failed to debug order groups:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to debug order groups'
    }, { status: 500 });
  }
}