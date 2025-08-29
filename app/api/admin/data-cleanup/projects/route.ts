import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { inArray } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectIds } = await request.json();

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'No project IDs provided' }, { status: 400 });
    }

    // Double-check that these projects are truly orphaned before deletion
    const orphanedCheck = await db.execute(sql`
      SELECT 
        bap.id,
        COUNT(DISTINCT bad.id) as domain_count,
        COUNT(DISTINCT poa.order_id) as order_count,
        COUNT(DISTINCT pw.website_id) as website_count,
        COUNT(DISTINCT vrp.request_id) as request_count,
        COUNT(DISTINCT wq.id) as qualification_count,
        COUNT(DISTINCT og.id) as order_group_count
      FROM bulk_analysis_projects bap
      LEFT JOIN bulk_analysis_domains bad ON bap.id = bad.project_id
      LEFT JOIN project_order_associations poa ON bap.id = poa.project_id
      LEFT JOIN project_websites pw ON bap.id = pw.project_id
      LEFT JOIN vetted_request_projects vrp ON bap.id = vrp.project_id
      LEFT JOIN website_qualifications wq ON bap.id = wq.project_id
      LEFT JOIN order_groups og ON bap.id = og.bulk_analysis_project_id
      WHERE bap.id IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})
      GROUP BY bap.id
    `);

    const errors: string[] = [];
    const safeToDelete: string[] = [];

    for (const row of orphanedCheck.rows as any[]) {
      if (row.domain_count > 0 || row.order_count > 0 || row.website_count > 0 || 
          row.request_count > 0 || row.qualification_count > 0 || row.order_group_count > 0) {
        errors.push(`Project ${row.id} has associated data and cannot be deleted`);
      } else {
        safeToDelete.push(row.id);
      }
    }

    let deleted = 0;
    if (safeToDelete.length > 0) {
      // Delete orphaned projects
      const result = await db
        .delete(bulkAnalysisProjects)
        .where(inArray(bulkAnalysisProjects.id, safeToDelete));
      
      deleted = safeToDelete.length;
    }

    // Log the deletion for audit purposes
    console.log(`[DATA CLEANUP] Deleted ${deleted} orphaned bulk analysis projects by user ${session.userId}`);

    return NextResponse.json({
      deleted,
      errors
    });

  } catch (error) {
    console.error('Error deleting orphaned projects:', error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
      return NextResponse.json({
        deleted: 0,
        errors: ['Some projects could not be deleted due to existing references'],
        message: 'Partial deletion - some projects still have references'
      });
    }

    return NextResponse.json(
      { 
        deleted: 0,
        errors: ['Failed to delete projects'],
        error: 'Failed to delete orphaned projects' 
      },
      { status: 500 }
    );
  }
}