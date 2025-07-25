import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkOnly = searchParams.get('check') === 'true';
  
  try {
    if (!checkOnly) {
      console.log('Running migrations...');
    } else {
      console.log('Checking migration status...');
    }
    
    // Only run migrations if not check-only mode
    if (!checkOnly) {
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
    }

    // Verify tables and columns were created
    const verificationResults: string[] = [];
    
    try {
      // Check if keyword_search_history table exists
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'keyword_search_history'
        ) as exists
      `);
      verificationResults.push(`keyword_search_history table: ${tableCheck.rows[0].exists ? '✓ exists' : '✗ missing'}`);
      
      // Check if columns exist in bulk_analysis_domains
      const columnCheck = await db.execute(sql`
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name = 'dataforseo_searched_keywords') as col1,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name = 'dataforseo_last_full_analysis_at') as col2,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name = 'dataforseo_total_api_calls') as col3,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name = 'dataforseo_incremental_api_calls') as col4
      `);
      const cols = columnCheck.rows[0];
      verificationResults.push(`dataforseo_searched_keywords column: ${cols.col1 ? '✓ exists' : '✗ missing'}`);
      verificationResults.push(`dataforseo_last_full_analysis_at column: ${cols.col2 ? '✓ exists' : '✗ missing'}`);
      verificationResults.push(`dataforseo_total_api_calls column: ${cols.col3 ? '✓ exists' : '✗ missing'}`);
      verificationResults.push(`dataforseo_incremental_api_calls column: ${cols.col4 ? '✓ exists' : '✗ missing'}`);
      
      // Check if columns exist in keyword_analysis_results
      const karColumnCheck = await db.execute(sql`
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keyword_analysis_results' AND column_name = 'analysis_batch_id') as col1,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keyword_analysis_results' AND column_name = 'is_incremental') as col2
      `);
      const karCols = karColumnCheck.rows[0];
      verificationResults.push(`analysis_batch_id column: ${karCols.col1 ? '✓ exists' : '✗ missing'}`);
      verificationResults.push(`is_incremental column: ${karCols.col2 ? '✓ exists' : '✗ missing'}`);
      
    } catch (verifyError: any) {
      console.error('Verification error:', verifyError);
      verificationResults.push(`Verification error: ${verifyError.message}`);
    }
    
    const allSuccessful = verificationResults.every(r => r.includes('✓'));
    
    return NextResponse.json({ 
      success: allSuccessful, 
      message: checkOnly
        ? (allSuccessful 
          ? 'All required tables and columns exist' 
          : 'Some tables or columns are missing - run migrations to fix')
        : (allSuccessful 
          ? 'All migrations completed and verified successfully' 
          : 'Migrations ran but some verifications failed'),
      migrations: checkOnly ? undefined : [
        'Added smart caching columns to bulk_analysis_domains',
        'Added batch tracking to keyword_analysis_results', 
        'Created keyword_search_history table',
        'Created performance indexes'
      ],
      verifications: verificationResults
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}