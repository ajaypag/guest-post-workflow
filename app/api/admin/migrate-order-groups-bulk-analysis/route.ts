import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // First check if column already exists
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_groups' 
      AND column_name = 'bulk_analysis_project_id'
    `);

    if (columnCheck.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Column already exists',
        alreadyExists: true
      }, { status: 409 });
    }

    // Add the column
    await db.execute(sql`
      ALTER TABLE order_groups
      ADD COLUMN bulk_analysis_project_id UUID
      REFERENCES bulk_analysis_projects(id)
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully added bulk_analysis_project_id column'
    });

  } catch (error: any) {
    console.error('Error adding bulk_analysis_project_id column:', error);
    
    // Check if it's a "column already exists" error
    if (error.message.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Column already exists',
        alreadyExists: true
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}