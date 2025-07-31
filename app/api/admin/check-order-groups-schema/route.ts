import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if order_groups table exists and get its schema
    const tableInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'order_groups'
      ORDER BY ordinal_position
    `);

    // Check if bulk_analysis_project_id column exists
    const hasBulkAnalysisColumn = tableInfo.rows.some(
      (row: any) => row.column_name === 'bulk_analysis_project_id'
    );

    // Check for index
    const indexInfo = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'order_groups'
      AND indexname = 'idx_order_groups_analysis'
    `);

    const hasIndex = indexInfo.rows.length > 0;

    return NextResponse.json({
      success: true,
      tableExists: tableInfo.rows.length > 0,
      hasBulkAnalysisColumn,
      hasIndex,
      columns: tableInfo.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      }))
    });

  } catch (error: any) {
    console.error('Error checking order_groups schema:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}