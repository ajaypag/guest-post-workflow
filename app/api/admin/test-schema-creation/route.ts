import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Test if the column exists first
    const testResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'target_pages' 
      AND column_name = 'normalized_url'
    `);

    if (testResult.rows && testResult.rows.length > 0) {
      return NextResponse.json({ 
        message: 'Column already exists',
        exists: true 
      });
    }

    // Add the column
    await db.execute(sql`
      ALTER TABLE target_pages 
      ADD COLUMN normalized_url VARCHAR(500)
    `);

    return NextResponse.json({ 
      message: 'Column created successfully',
      exists: false,
      created: true 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      exists: false,
      created: false 
    }, { status: 500 });
  }
}