import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // WARNING: This will rollback the domain normalization
    
    // Step 1: Drop triggers
    await db.execute(sql`
      DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites
    `);
    
    await db.execute(sql`
      DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains
    `);

    // Step 2: Drop indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_websites_normalized_domain
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_bulk_normalized_domain
    `);

    // Step 3: Drop functions
    await db.execute(sql`
      DROP FUNCTION IF EXISTS trigger_normalize_domain() CASCADE
    `);
    
    await db.execute(sql`
      DROP FUNCTION IF EXISTS normalize_domain(TEXT) CASCADE
    `);
    
    await db.execute(sql`
      DROP FUNCTION IF EXISTS find_website_by_domain(TEXT) CASCADE
    `);

    // Step 4: Restore merged websites (if any)
    await db.execute(sql`
      UPDATE websites
      SET 
        domain = REPLACE(domain, '_MERGED_' || substring(id::text from 1 for 8), ''),
        normalized_domain = REPLACE(normalized_domain, '_MERGED_' || substring(id::text from 1 for 8), '')
      WHERE domain LIKE '%_MERGED_%'
    `);

    // Step 5: Drop normalized columns (optional - might want to keep for reference)
    // Commenting out for safety - uncomment if you really want to remove columns
    /*
    await db.execute(sql`
      ALTER TABLE websites DROP COLUMN IF EXISTS normalized_domain
    `);
    
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains DROP COLUMN IF EXISTS normalized_domain
    `);
    */

    // Step 6: Drop helper views
    await db.execute(sql`
      DROP VIEW IF EXISTS duplicate_websites
    `);
    
    await db.execute(sql`
      DROP VIEW IF EXISTS website_domain_summary
    `);

    return NextResponse.json({
      success: true,
      message: 'Domain normalization has been rolled back successfully'
    });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { success: false, error: `Rollback failed: ${error}` },
      { status: 500 }
    );
  }
}