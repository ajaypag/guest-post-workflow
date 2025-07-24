import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

// Check migration status
export async function GET(request: NextRequest) {
  try {
    // Check if tables exist
    const tablesResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'keyword_analysis_results'
      ) as keyword_analysis_results,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'keyword_analysis_batches'
      ) as keyword_analysis_batches
    `);

    // Check if columns exist in bulk_analysis_domains
    const columnsResult = await db.execute(sql`
      SELECT 
        EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_status'
        ) as dataforseo_status,
        EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_keywords_found'
        ) as dataforseo_keywords_found,
        EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_analyzed_at'
        ) as dataforseo_analyzed_at
    `);

    const tables = tablesResult.rows[0] as any;
    const columns = columnsResult.rows[0] as any;

    const tablesExist = tables.keyword_analysis_results && tables.keyword_analysis_batches;
    const columnsExist = columns.dataforseo_status && columns.dataforseo_keywords_found && columns.dataforseo_analyzed_at;

    // Check environment variables
    const environmentVariables = {
      login: !!process.env.DATAFORSEO_LOGIN,
      password: !!process.env.DATAFORSEO_PASSWORD,
    };

    return NextResponse.json({
      success: true,
      status: {
        tablesExist,
        columnsExist,
        details: {
          keywordAnalysisResults: tables.keyword_analysis_results,
          keywordAnalysisBatches: tables.keyword_analysis_batches,
          bulkAnalysisDomainsColumns: {
            dataforseo_status: columns.dataforseo_status,
            dataforseo_keywords_found: columns.dataforseo_keywords_found,
            dataforseo_analyzed_at: columns.dataforseo_analyzed_at,
          },
        },
        environmentVariables,
      },
    });
  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error.message },
      { status: 500 }
    );
  }
}

// Apply migration
export async function POST(request: NextRequest) {
  try {
    // Create keyword_analysis_results table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS keyword_analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        position INTEGER NOT NULL,
        search_volume INTEGER,
        url TEXT NOT NULL,
        keyword_difficulty INTEGER,
        cpc DECIMAL(10, 2),
        competition VARCHAR(20),
        location_code INTEGER NOT NULL DEFAULT 2840,
        language_code VARCHAR(10) NOT NULL DEFAULT 'en',
        analysis_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for keyword_analysis_results
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_analysis_domain 
      ON keyword_analysis_results(bulk_analysis_domain_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_analysis_position 
      ON keyword_analysis_results(position)
    `);

    // Create keyword_analysis_batches table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS keyword_analysis_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        keywords_analyzed INTEGER DEFAULT 0,
        location_code INTEGER NOT NULL DEFAULT 2840,
        language_code VARCHAR(10) NOT NULL DEFAULT 'en',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Add columns to bulk_analysis_domains if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_status'
        ) THEN
          ALTER TABLE bulk_analysis_domains 
          ADD COLUMN dataforseo_status VARCHAR(50) DEFAULT 'pending';
        END IF;

        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_keywords_found'
        ) THEN
          ALTER TABLE bulk_analysis_domains 
          ADD COLUMN dataforseo_keywords_found INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'bulk_analysis_domains' 
          AND column_name = 'dataforseo_analyzed_at'
        ) THEN
          ALTER TABLE bulk_analysis_domains 
          ADD COLUMN dataforseo_analyzed_at TIMESTAMP;
        END IF;
      END $$;
    `);

    return NextResponse.json({
      success: true,
      message: 'DataForSEO migration applied successfully',
    });
  } catch (error: any) {
    console.error('Error applying migration:', error);
    return NextResponse.json(
      { error: 'Failed to apply migration', details: error.message },
      { status: 500 }
    );
  }
}

// Rollback migration
export async function DELETE(request: NextRequest) {
  try {
    // Drop tables (CASCADE will handle foreign key constraints)
    await db.execute(sql`DROP TABLE IF EXISTS keyword_analysis_results CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS keyword_analysis_batches CASCADE`);

    // Remove columns from bulk_analysis_domains
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains 
      DROP COLUMN IF EXISTS dataforseo_status,
      DROP COLUMN IF EXISTS dataforseo_keywords_found,
      DROP COLUMN IF EXISTS dataforseo_analyzed_at
    `);

    return NextResponse.json({
      success: true,
      message: 'DataForSEO migration rolled back successfully',
    });
  } catch (error: any) {
    console.error('Error rolling back migration:', error);
    return NextResponse.json(
      { error: 'Failed to rollback migration', details: error.message },
      { status: 500 }
    );
  }
}