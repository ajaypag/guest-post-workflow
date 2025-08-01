import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Add the normalized_url column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE target_pages 
      ADD COLUMN IF NOT EXISTS normalized_url VARCHAR(500)
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_target_pages_normalized_url 
      ON target_pages(normalized_url)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_target_pages_client_normalized_url 
      ON target_pages(client_id, normalized_url)
    `);

    return NextResponse.json({ 
      success: true,
      message: 'Normalized URL column and indexes created successfully' 
    });
  } catch (error) {
    console.error('Error creating normalized URL column:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create normalized URL column',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}