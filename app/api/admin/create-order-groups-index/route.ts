import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if index already exists
    const indexCheck = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'order_groups'
      AND indexname = 'idx_order_groups_analysis'
    `);

    if (indexCheck.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Index already exists',
        alreadyExists: true
      }, { status: 409 });
    }

    // Create the index
    await db.execute(sql`
      CREATE INDEX idx_order_groups_analysis 
      ON order_groups(bulk_analysis_project_id)
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully created index on bulk_analysis_project_id'
    });

  } catch (error: any) {
    console.error('Error creating index:', error);
    
    // Check if it's an "index already exists" error
    if (error.message.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Index already exists',
        alreadyExists: true
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}