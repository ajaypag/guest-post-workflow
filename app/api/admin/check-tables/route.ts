import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check for bulk_analysis_domains table
    const tableCheck = await db.execute(sql`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bulk_analysis_domains', 'bulk_analysis_projects', 'users', 'clients', 'orders')
      ORDER BY table_name
    `);
    
    // Check columns of bulk_analysis_domains if it exists
    const columnCheck = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'bulk_analysis_domains'
      ORDER BY ordinal_position
    `);
    
    // Try to count rows in bulk_analysis_domains
    let rowCount = null;
    let countError = null;
    try {
      const count = await db.execute(sql`SELECT COUNT(*) as count FROM bulk_analysis_domains`);
      rowCount = count.rows[0]?.count || 0;
    } catch (err) {
      countError = err instanceof Error ? err.message : 'Unknown error';
    }
    
    return NextResponse.json({
      tables: tableCheck.rows,
      bulk_analysis_domains_columns: columnCheck.rows,
      bulk_analysis_domains_row_count: rowCount,
      count_error: countError,
      message: 'Table check completed'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        tables: [],
        bulk_analysis_domains_columns: []
      },
      { status: 500 }
    );
  }
}