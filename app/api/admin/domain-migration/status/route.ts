import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { websites } from '@/lib/db/schema';

export async function GET() {
  try {
    // Check migration status
    const [
      columnCheck,
      functionCheck,
      triggerCheck,
      indexCheck,
      stats,
      duplicates
    ] = await Promise.all([
      // Check if normalized_domain column exists
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_name = 'websites' 
        AND column_name = 'normalized_domain'
      `),
      
      // Check if normalization function exists
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.routines 
        WHERE routine_name = 'normalize_domain'
      `),
      
      // Check if triggers exist
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.triggers 
        WHERE trigger_name = 'normalize_website_domain_trigger'
      `),
      
      // Check if indexes exist
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes 
        WHERE indexname = 'idx_websites_normalized_domain'
      `),
      
      // Get statistics
      db.execute(sql`
        SELECT 
          COUNT(*) as total_websites,
          COUNT(normalized_domain) as normalized_count,
          COUNT(DISTINCT normalized_domain) as unique_normalized
        FROM websites
      `),
      
      // Get duplicates
      db.execute(sql`
        SELECT 
          normalized_domain,
          COUNT(*) as duplicate_count,
          ARRAY_AGG(id ORDER BY created_at) as website_ids,
          ARRAY_AGG(domain ORDER BY created_at) as original_domains,
          MIN(created_at) as first_created,
          MAX(created_at) as last_created
        FROM websites
        WHERE normalized_domain IS NOT NULL
        GROUP BY normalized_domain
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 100
      `)
    ]);

    const hasNormalizedColumn = (columnCheck.rows[0] as any).count > 0;
    const hasNormalizationFunction = (functionCheck.rows[0] as any).count > 0;
    const hasTriggers = (triggerCheck.rows[0] as any).count > 0;
    const hasIndexes = (indexCheck.rows[0] as any).count > 0;
    
    const statsRow = stats.rows[0] as any;
    const totalWebsites = parseInt(statsRow.total_websites);
    const normalizedCount = parseInt(statsRow.normalized_count);
    const uniqueNormalized = parseInt(statsRow.unique_normalized);
    
    const duplicateGroups = duplicates.rows.length;
    const duplicateWebsites = duplicates.rows.reduce((sum: number, row: any) => 
      sum + (parseInt(row.duplicate_count) - 1), 0
    );

    const migrationComplete = hasNormalizedColumn && 
                             hasNormalizationFunction && 
                             hasTriggers && 
                             hasIndexes &&
                             normalizedCount === totalWebsites;

    return NextResponse.json({
      success: true,
      status: {
        hasNormalizedColumn,
        hasNormalizationFunction,
        hasTriggers,
        hasIndexes,
        totalWebsites,
        normalizedCount,
        duplicateGroups,
        duplicateWebsites,
        migrationComplete,
        lastMigrationDate: null // Could track this in a separate table
      },
      duplicates: duplicates.rows.map((row: any) => ({
        normalizedDomain: row.normalized_domain,
        duplicateCount: parseInt(row.duplicate_count),
        websiteIds: row.website_ids,
        originalDomains: row.original_domains,
        firstCreated: row.first_created,
        lastCreated: row.last_created
      }))
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}