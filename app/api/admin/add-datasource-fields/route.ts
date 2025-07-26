import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Adding data source tracking fields to bulk_analysis_domains table...');

    // Add the missing fields
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      ADD COLUMN IF NOT EXISTS has_dataforseo_results BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS dataforseo_last_analyzed TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ai_qualification_reasoning TEXT,
      ADD COLUMN IF NOT EXISTS ai_qualified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS was_manually_qualified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS manually_qualified_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS manually_qualified_at TIMESTAMP
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

export async function DELETE() {
  try {
    console.log('Rolling back data source fields migration...');

    // Remove the data source tracking columns
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      DROP COLUMN IF EXISTS has_dataforseo_results,
      DROP COLUMN IF EXISTS dataforseo_last_analyzed,
      DROP COLUMN IF EXISTS ai_qualification_reasoning,
      DROP COLUMN IF EXISTS ai_qualified_at,
      DROP COLUMN IF EXISTS was_manually_qualified,
      DROP COLUMN IF EXISTS manually_qualified_by,
      DROP COLUMN IF EXISTS manually_qualified_at
    `);

    console.log('Data source tracking fields removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Data source tracking fields removed successfully'
    });

  } catch (error: any) {
    console.error('Error removing data source fields:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove data source fields'
    }, { status: 500 });
  }
}