import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Verify column exists
    const columnCheck = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'order_groups' 
      AND column_name = 'bulk_analysis_project_id'
    `);

    if (columnCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Column bulk_analysis_project_id not found'
      }, { status: 404 });
    }

    // Verify foreign key constraint
    const fkCheck = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'order_groups'
        AND kcu.column_name = 'bulk_analysis_project_id'
    `);

    // Verify index exists
    const indexCheck = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'order_groups'
      AND indexname = 'idx_order_groups_analysis'
    `);

    // Get count of order groups with bulk analysis projects
    const countCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_order_groups,
        COUNT(bulk_analysis_project_id) as with_projects
      FROM order_groups
    `);

    const column = columnCheck.rows[0] as any;
    const count = countCheck.rows[0] as any;

    return NextResponse.json({
      success: true,
      migration: {
        columnExists: true,
        columnType: column.data_type,
        columnNullable: column.is_nullable === 'YES',
        foreignKeyExists: fkCheck.rows.length > 0,
        foreignKeyDetails: fkCheck.rows[0] || null,
        indexExists: indexCheck.rows.length > 0,
        statistics: {
          totalOrderGroups: parseInt(count.total_order_groups),
          withProjects: parseInt(count.with_projects)
        }
      }
    });

  } catch (error: any) {
    console.error('Error verifying migration:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}