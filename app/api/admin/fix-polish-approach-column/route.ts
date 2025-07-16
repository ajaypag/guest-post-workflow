import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting polish_approach column fix...');
    
    // Start transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Alter the polish_approach column from varchar(100) to varchar(255)
      console.log('Altering polish_approach column to varchar(255)...');
      await db.execute(sql`
        ALTER TABLE polish_sections
        ALTER COLUMN polish_approach TYPE varchar(255)
      `);
      
      // Also fix the title column while we're at it
      console.log('Altering title column to varchar(500) for safety...');
      await db.execute(sql`
        ALTER TABLE polish_sections
        ALTER COLUMN title TYPE varchar(500)
      `);
      
      // Commit the transaction
      await db.execute(sql`COMMIT`);
      console.log('Column alterations committed successfully');
      
      // Verify the changes
      const columnCheck = await db.execute(sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'polish_sections'
        AND column_name IN ('polish_approach', 'title')
        ORDER BY column_name
      `);
      
      return NextResponse.json({
        success: true,
        message: 'Polish columns successfully updated',
        columns: columnCheck
      });
      
    } catch (error) {
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error fixing polish columns:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail
    }, { status: 500 });
  }
}