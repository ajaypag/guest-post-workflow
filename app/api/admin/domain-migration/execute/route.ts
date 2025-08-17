import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Read and execute the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0037_normalize_existing_domains.sql');
    
    // For now, we'll execute the migration steps programmatically
    // In production, you might want to use a migration tool
    
    // Step 1: Add normalized_domain column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255)
    `);

    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains
      ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255)
    `);

    // Step 2: Create normalization function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION normalize_domain(input_domain TEXT) 
      RETURNS TEXT AS $$
      DECLARE
          normalized TEXT;
      BEGIN
          IF input_domain IS NULL OR input_domain = '' THEN
              RETURN NULL;
          END IF;
          
          normalized := LOWER(TRIM(input_domain));
          normalized := REGEXP_REPLACE(normalized, '^https?://', '');
          normalized := REGEXP_REPLACE(normalized, '^www\\.', '');
          normalized := REGEXP_REPLACE(normalized, '/.*$', '');
          normalized := REGEXP_REPLACE(normalized, ':[0-9]+$', '');
          normalized := RTRIM(normalized, '.');
          
          RETURN normalized;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    // Step 3: Normalize existing domains
    const websiteUpdate = await db.execute(sql`
      UPDATE websites 
      SET normalized_domain = normalize_domain(domain)
      WHERE normalized_domain IS NULL
    `);

    const bulkUpdate = await db.execute(sql`
      UPDATE bulk_analysis_domains
      SET normalized_domain = normalize_domain(domain)
      WHERE normalized_domain IS NULL
    `);

    // Step 4: Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_websites_normalized_domain 
      ON websites(normalized_domain)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bulk_normalized_domain 
      ON bulk_analysis_domains(normalized_domain)
    `);

    // Step 5: Create triggers
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION trigger_normalize_domain()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.normalized_domain := normalize_domain(NEW.domain);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites
    `);

    await db.execute(sql`
      CREATE TRIGGER normalize_website_domain_trigger
      BEFORE INSERT OR UPDATE OF domain ON websites
      FOR EACH ROW
      EXECUTE FUNCTION trigger_normalize_domain()
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains
    `);

    await db.execute(sql`
      CREATE TRIGGER normalize_bulk_domain_trigger
      BEFORE INSERT OR UPDATE OF domain ON bulk_analysis_domains
      FOR EACH ROW
      EXECUTE FUNCTION trigger_normalize_domain()
    `);

    // Step 6: Create helper function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION find_website_by_domain(input_domain TEXT)
      RETURNS SETOF websites AS $$
      BEGIN
          RETURN QUERY
          SELECT * FROM websites 
          WHERE normalized_domain = normalize_domain(input_domain)
          LIMIT 1;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Step 7: Check for duplicates
    const duplicates = await db.execute(sql`
      SELECT 
        normalized_domain,
        COUNT(*) as duplicate_count
      FROM websites
      WHERE normalized_domain IS NOT NULL
      GROUP BY normalized_domain
      HAVING COUNT(*) > 1
    `);

    const duplicateGroups = duplicates.rows.length;
    const duplicateWebsites = duplicates.rows.reduce((sum: number, row: any) => 
      sum + (parseInt(row.duplicate_count) - 1), 0
    );

    return NextResponse.json({
      success: true,
      normalizedCount: websiteUpdate.rowCount,
      duplicateGroups,
      duplicateWebsites,
      message: 'Migration executed successfully'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: `Migration failed: ${error}` },
      { status: 500 }
    );
  }
}