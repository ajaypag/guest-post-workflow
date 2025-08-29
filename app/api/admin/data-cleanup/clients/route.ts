import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientIds } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'No client IDs provided' }, { status: 400 });
    }

    // Double-check that these clients are truly orphaned before deletion
    const orphanedCheck = await db.execute(sql`
      SELECT 
        c.id,
        COUNT(DISTINCT tp.id) as target_page_count,
        COUNT(DISTINCT bap.id) as project_count,
        COUNT(DISTINCT og.id) as order_count,
        COUNT(DISTINCT vrc.request_id) as request_count
      FROM clients c
      LEFT JOIN target_pages tp ON c.id = tp.client_id
      LEFT JOIN bulk_analysis_projects bap ON c.id = bap.client_id
      LEFT JOIN order_groups og ON c.id = og.client_id
      LEFT JOIN vetted_request_clients vrc ON c.id = vrc.client_id
      WHERE c.id IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})
      GROUP BY c.id
    `);

    const errors: string[] = [];
    const safeToDelete: string[] = [];

    for (const row of orphanedCheck.rows as any[]) {
      if (row.target_page_count > 0 || row.project_count > 0 || row.order_count > 0 || row.request_count > 0) {
        errors.push(`Client ${row.id} has associated data and cannot be deleted`);
      } else {
        safeToDelete.push(row.id);
      }
    }

    let deleted = 0;
    if (safeToDelete.length > 0) {
      // Delete the orphaned clients
      const result = await db
        .delete(clients)
        .where(inArray(clients.id, safeToDelete));

      deleted = safeToDelete.length;
    }

    return NextResponse.json({
      deleted,
      errors
    });

  } catch (error) {
    console.error('Error deleting clients:', error);
    return NextResponse.json(
      { error: 'Failed to delete clients' },
      { status: 500 }
    );
  }
}