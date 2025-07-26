import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Adding data source tracking fields to bulk_analysis_domains table...');

    // Add the missing fields
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN IF NOT EXISTS has_dataforseo_results BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS dataforseo_last_analyzed TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ai_qualification_reasoning TEXT,
      ADD COLUMN IF NOT EXISTS ai_qualified_at TIMESTAMP
    `);

    console.log('Fields added successfully');

    // Check the table structure
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bulk_analysis_domains'
      AND column_name IN ('has_dataforseo_results', 'dataforseo_last_analyzed', 'ai_qualification_reasoning', 'ai_qualified_at')
      ORDER BY column_name
    `);

    return NextResponse.json({
      success: true,
      message: 'Data source tracking fields added successfully',
      columns: result.rows
    });
  } catch (error: any) {
    console.error('Error adding data source fields:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}