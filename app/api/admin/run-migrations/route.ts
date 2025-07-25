import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Running migrations...');
    
    // Run migration for smart caching columns
    await db.execute(sql`
      -- Add columns for smart caching of DataForSEO results
      ALTER TABLE bulk_analysis_domains
      ADD COLUMN IF NOT EXISTS dataforseo_searched_keywords TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS dataforseo_last_full_analysis_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dataforseo_total_api_calls INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dataforseo_incremental_api_calls INTEGER DEFAULT 0;
    `);

    // Add columns to keyword_analysis_results
    await db.execute(sql`
      ALTER TABLE keyword_analysis_results
      ADD COLUMN IF NOT EXISTS analysis_batch_id UUID,
      ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN DEFAULT FALSE;
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_analysis_results_keyword_domain 
      ON keyword_analysis_results(bulk_analysis_domain_id, keyword);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_analysis_results_batch
      ON keyword_analysis_results(analysis_batch_id, created_at DESC);
    `);

    // Create keyword search history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS keyword_search_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        location_code INTEGER NOT NULL DEFAULT 2840,
        language_code VARCHAR(10) NOT NULL DEFAULT 'en',
        has_results BOOLEAN NOT NULL DEFAULT FALSE,
        searched_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(bulk_analysis_domain_id, keyword, location_code, language_code)
      );
    `);

    // Create indexes for keyword search history
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_search_history_domain 
      ON keyword_search_history(bulk_analysis_domain_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_search_history_searched_at 
      ON keyword_search_history(searched_at);
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      migrations: [
        'Added smart caching columns to bulk_analysis_domains',
        'Added batch tracking to keyword_analysis_results', 
        'Created keyword_search_history table',
        'Created performance indexes'
      ]
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}