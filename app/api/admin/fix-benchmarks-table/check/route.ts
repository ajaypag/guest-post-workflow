import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if the order_benchmarks table exists and what columns it has
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'order_benchmarks'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = tableInfo.rows.map((row: any) => row.column_name);
    
    // Expected columns
    const requiredColumns = [
      'id',
      'order_id',
      'version',
      'is_latest',
      'captured_at',
      'captured_by',
      'capture_reason',
      'benchmark_type',
      'benchmark_data',
      'notes',
      'created_at',
      'updated_at'
    ];
    
    // Find missing columns
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    // Check if table exists
    if (existingColumns.length === 0) {
      return NextResponse.json({
        exists: false,
        message: 'order_benchmarks table does not exist',
        needsFix: true,
        createTable: true
      });
    }
    
    // Check if we need to add columns
    if (missingColumns.length > 0) {
      return NextResponse.json({
        exists: true,
        existingColumns,
        missingColumns,
        needsFix: true,
        message: `Missing columns: ${missingColumns.join(', ')}`
      });
    }
    
    // Table is good
    return NextResponse.json({
      exists: true,
      existingColumns,
      missingColumns: [],
      needsFix: false,
      message: 'Table structure is correct'
    });
    
  } catch (error: any) {
    console.error('Error checking benchmarks table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check table structure' },
      { status: 500 }
    );
  }
}