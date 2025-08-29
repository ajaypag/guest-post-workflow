import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { targetPages } from '@/lib/db/schema';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetPageIds } = await request.json();

    if (!targetPageIds || !Array.isArray(targetPageIds) || targetPageIds.length === 0) {
      return NextResponse.json({ error: 'No target page IDs provided' }, { status: 400 });
    }

    // Double-check that these target pages are truly orphaned before deletion
    const orphanedCheck = await db.execute(sql`
      SELECT 
        tp.id,
        COUNT(DISTINCT oli.id) as order_item_count,
        COUNT(DISTINCT tpi.id) as intelligence_count,
        COUNT(DISTINCT igl.id) as log_count,
        COUNT(DISTINCT w.id) as workflow_count
      FROM target_pages tp
      LEFT JOIN order_line_items oli ON tp.id = oli.target_page_id
      LEFT JOIN target_page_intelligence tpi ON tp.id = tpi.target_page_id
      LEFT JOIN intelligence_generation_logs igl ON tp.id = igl.target_page_id
      LEFT JOIN workflows w ON tp.id = w.target_page_id
      WHERE tp.id IN (${sql.join(targetPageIds.map(id => sql`${id}`), sql`, `)})
      GROUP BY tp.id
    `);

    const errors: string[] = [];
    const safeToDelete: string[] = [];

    for (const row of orphanedCheck.rows as any[]) {
      if (row.order_item_count > 0 || row.intelligence_count > 0 || row.log_count > 0 || row.workflow_count > 0) {
        errors.push(`Target page ${row.id} has associated data and cannot be deleted`);
      } else {
        safeToDelete.push(row.id);
      }
    }

    let deleted = 0;
    if (safeToDelete.length > 0) {
      // Delete orphaned target pages using IN clause
      // PostgreSQL will handle CASCADE deletions for any dependent records
      const deleteResult = await db.execute(sql`
        DELETE FROM target_pages 
        WHERE id IN (${sql.join(safeToDelete.map(id => sql`${id}::uuid`), sql`, `)})
      `);
      deleted = safeToDelete.length;
    }

    // Log the deletion for audit purposes
    console.log(`[DATA CLEANUP] Deleted ${deleted} orphaned target pages by user ${session.userId}`);

    return NextResponse.json({
      deleted,
      errors
    });

  } catch (error) {
    console.error('Error deleting orphaned target pages:', error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
      return NextResponse.json({
        deleted: 0,
        errors: ['Some target pages could not be deleted due to existing references'],
        message: 'Partial deletion - some pages still have references'
      });
    }

    return NextResponse.json(
      { 
        deleted: 0,
        errors: ['Failed to delete target pages'],
        error: 'Failed to delete orphaned target pages' 
      },
      { status: 500 }
    );
  }
}