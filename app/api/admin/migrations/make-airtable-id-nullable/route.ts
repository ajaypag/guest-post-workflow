import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting migration: Make Airtable ID Nullable');

    // Step 1: Make airtable_id nullable
    await db.execute(sql`
      ALTER TABLE websites 
      ALTER COLUMN airtable_id DROP NOT NULL
    `);
    console.log('✓ Made airtable_id nullable');

    // Step 2: Add source tracking columns
    await db.execute(sql`
      ALTER TABLE websites
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'airtable',
      ADD COLUMN IF NOT EXISTS added_by_publisher_id UUID REFERENCES publishers(id),
      ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(100)
    `);
    console.log('✓ Added source tracking columns');

    // Step 3: Add comments for documentation
    await db.execute(sql`
      COMMENT ON COLUMN websites.source IS 'Source of website data: airtable, publisher, internal, api';
      COMMENT ON COLUMN websites.added_by_publisher_id IS 'Publisher who added this website (if source=publisher)';
      COMMENT ON COLUMN websites.added_by_user_id IS 'Internal user who added this website (if source=internal)';
      COMMENT ON COLUMN websites.source_metadata IS 'Additional metadata about the source (import details, API info, etc)';
      COMMENT ON COLUMN websites.import_batch_id IS 'Batch identifier for bulk imports';
    `);
    console.log('✓ Added column comments');

    // Step 4: Update existing records to have proper source
    const updateResult = await db.execute(sql`
      UPDATE websites 
      SET source = 'airtable' 
      WHERE airtable_id IS NOT NULL AND source IS NULL
    `);
    console.log(`✓ Updated ${updateResult.rowCount} existing records with source='airtable'`);

    // Step 5: Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_source ON websites(source);
      CREATE INDEX IF NOT EXISTS idx_websites_added_by_publisher ON websites(added_by_publisher_id) WHERE added_by_publisher_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_websites_added_by_user ON websites(added_by_user_id) WHERE added_by_user_id IS NOT NULL;
    `);
    console.log('✓ Created indexes for source tracking');

    // Step 6: Add check constraint for source values
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'check_website_source'
        ) THEN
          ALTER TABLE websites
          ADD CONSTRAINT check_website_source 
          CHECK (source IN ('airtable', 'publisher', 'internal', 'api', 'migration', 'manual'));
        END IF;
      END $$;
    `);
    console.log('✓ Added source value constraint');

    // Step 7: Create placeholder ID generation function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION generate_placeholder_airtable_id(source_type VARCHAR, entity_id UUID)
      RETURNS VARCHAR AS $$
      BEGIN
        RETURN UPPER(source_type || '_' || 
                     TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '_' || 
                     SUBSTRING(entity_id::TEXT, 1, 8));
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Created placeholder ID generation function');

    // Step 8: Verify the migration
    const verifyResult = await db.execute(sql`
      SELECT 
        is_nullable,
        column_name
      FROM information_schema.columns
      WHERE table_name = 'websites' 
      AND column_name IN ('airtable_id', 'source', 'added_by_publisher_id')
      ORDER BY column_name
    `);

    const columns = verifyResult.rows as any[];
    const airtableNullable = columns.find(c => c.column_name === 'airtable_id')?.is_nullable === 'YES';
    const sourceExists = columns.find(c => c.column_name === 'source') !== undefined;
    const publisherIdExists = columns.find(c => c.column_name === 'added_by_publisher_id') !== undefined;

    if (!airtableNullable || !sourceExists || !publisherIdExists) {
      throw new Error('Migration verification failed');
    }

    // Get statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_websites,
        COUNT(airtable_id) as with_airtable_id,
        COUNT(*) - COUNT(airtable_id) as without_airtable_id,
        COUNT(CASE WHEN source = 'publisher' THEN 1 END) as publisher_added,
        COUNT(CASE WHEN source = 'airtable' THEN 1 END) as airtable_added
      FROM websites
    `);

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0044_make_airtable_id_nullable', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully made airtable_id nullable and added source tracking',
      details: {
        airtableIdNullable: true,
        sourceTrackingAdded: true,
        statistics: stats.rows[0]
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if migration has been applied
    const result = await db.execute(sql`
      SELECT 
        is_nullable,
        column_name
      FROM information_schema.columns
      WHERE table_name = 'websites' 
      AND column_name = 'airtable_id'
    `);

    const isApplied = result.rows.length > 0 && (result.rows[0] as any).is_nullable === 'YES';

    // Get statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_websites,
        COUNT(airtable_id) as with_airtable_id,
        COUNT(*) - COUNT(airtable_id) as without_airtable_id
      FROM websites
    `);

    return NextResponse.json({
      applied: isApplied,
      statistics: stats.rows[0]
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}