import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bulk_analysis_domains' 
      AND column_name = 'selected_target_page_id'
    `);

    if (checkColumn.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Column already exists' 
      });
    }

    // Add the column
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN selected_target_page_id UUID
    `);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully added selected_target_page_id column'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}