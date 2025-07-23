import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check which columns exist in bulk_analysis_domains table
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name IN ('has_workflow', 'workflow_id', 'workflow_created_at')
    `);
    
    const existingColumns = result.rows.map((row: any) => row.column_name);
    const requiredColumns = ['has_workflow', 'workflow_id', 'workflow_created_at'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    return NextResponse.json({
      status: {
        migration_needed: missingColumns.length > 0,
        columns_found: existingColumns,
        missing_columns: missingColumns
      }
    });
  } catch (error: any) {
    console.error('Error checking bulk analysis improvements:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}