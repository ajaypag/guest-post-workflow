import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if the benchmark_comparisons table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'benchmark_comparisons'
      ) as exists
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return NextResponse.json({
        exists: false,
        needsCreation: true,
        message: 'benchmark_comparisons table does not exist'
      });
    }
    
    // If table exists, check its structure
    const columnInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'benchmark_comparisons'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      exists: true,
      needsCreation: false,
      message: 'Table already exists',
      columns: columnInfo.rows
    });
    
  } catch (error: any) {
    console.error('Error checking benchmark_comparisons table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check table' },
      { status: 500 }
    );
  }
}