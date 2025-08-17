import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.execute) {
      return NextResponse.json({
        message: 'This will add missing performance metrics columns to publisher_performance table',
        preview: true,
        sqlFile: 'migrations/0041_add_missing_performance_columns.sql'
      });
    }

    // Read and execute the SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0041_add_missing_performance_columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: 0041_add_missing_performance_columns.sql');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    // Verify the columns were added
    const columnsCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'publisher_performance' 
      AND column_name IN (
        'content_approval_rate', 
        'revision_rate', 
        'total_revenue', 
        'avg_order_value', 
        'last_calculated_at'
      )
    `);

    const columnsAdded = {
      content_approval_rate: columnsCheck.rows.some((r: any) => r.column_name === 'content_approval_rate'),
      revision_rate: columnsCheck.rows.some((r: any) => r.column_name === 'revision_rate'),
      total_revenue: columnsCheck.rows.some((r: any) => r.column_name === 'total_revenue'),
      avg_order_value: columnsCheck.rows.some((r: any) => r.column_name === 'avg_order_value'),
      last_calculated_at: columnsCheck.rows.some((r: any) => r.column_name === 'last_calculated_at'),
    };

    return NextResponse.json({
      success: true,
      message: 'Publisher performance columns migration completed successfully',
      details: {
        migrationFile: '0041_add_missing_performance_columns.sql',
        columnsAdded,
        summary: 'Added performance metrics columns to publisher_performance table'
      }
    });

  } catch (error) {
    console.error('Publisher performance columns migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      details: {
        migrationFile: '0041_add_missing_performance_columns.sql',
        step: 'Adding publisher performance columns'
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Publisher Performance Columns Migration',
    description: 'Adds missing performance metrics columns to publisher_performance table',
    sqlFile: '0041_add_missing_performance_columns.sql',
    status: 'ready'
  });
}