import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

interface DomainPreview {
  id: string;
  originalDomain: string;
  normalizedDomain: string;
}

interface ConflictInfo {
  normalizedDomain: string;
  conflictingUnnormalized: string;
  existingNormalized: string;
  unnormalizedId: string;
  normalizedId: string;
}

interface NormalizationStats {
  total: number;
  needsNormalization: number;
  conflicts: number;
  normalized: number;
  errors: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Generating domain normalization preview...');
    
    // Get total website count
    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM websites`);
    const totalWebsites = (totalResult.rows[0] as any).count;
    
    // Get websites that need normalization
    const unnormalizedResult = await db.execute(sql`
      SELECT 
        id,
        domain,
        lower(trim(trailing '/' from 
          CASE
            WHEN domain LIKE 'www.%' OR domain LIKE 'WWW.%' THEN regexp_replace(
              CASE
                WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                ELSE domain
              END, '^www\.', '', 'i')
            ELSE 
              CASE
                WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                ELSE domain
              END
          END
        )) as normalized_domain
      FROM websites
      WHERE 
        domain LIKE 'www.%' 
        OR domain LIKE 'WWW.%'
        OR domain LIKE 'http://%'
        OR domain LIKE 'https://%'
        OR domain LIKE '%/'
        OR domain != lower(trim(domain))
      ORDER BY domain
    `);
    
    const preview: DomainPreview[] = unnormalizedResult.rows.map((row: any) => ({
      id: row.id,
      originalDomain: row.domain,
      normalizedDomain: row.normalized_domain
    }));
    
    console.log(`Found ${preview.length} websites that need normalization`);
    
    // Check for conflicts
    const conflictResult = await db.execute(sql`
      WITH normalized AS (
        SELECT 
          id,
          domain as original_domain,
          lower(trim(trailing '/' from 
            CASE
              WHEN domain LIKE 'www.%' OR domain LIKE 'WWW.%' THEN regexp_replace(
                CASE
                  WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  ELSE domain
                END, '^www\.', '', 'i')
              ELSE 
                CASE
                  WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  ELSE domain
                END
            END
          )) as normalized_domain
        FROM websites
        WHERE 
          domain LIKE 'www.%' 
          OR domain LIKE 'WWW.%'
          OR domain LIKE 'http://%'
          OR domain LIKE 'https://%'
          OR domain LIKE '%/'
          OR domain != lower(trim(domain))
      )
      SELECT 
        n.normalized_domain,
        n.original_domain as conflicting_unnormalized,
        w.domain as existing_normalized,
        n.id as unnormalized_id,
        w.id as normalized_id
      FROM normalized n
      JOIN websites w ON w.domain = n.normalized_domain
      WHERE w.id != n.id
      ORDER BY n.normalized_domain
    `);
    
    const conflicts: ConflictInfo[] = conflictResult.rows.map((row: any) => ({
      normalizedDomain: row.normalized_domain,
      conflictingUnnormalized: row.conflicting_unnormalized,
      existingNormalized: row.existing_normalized,
      unnormalizedId: row.unnormalized_id,
      normalizedId: row.normalized_id
    }));
    
    console.log(`Found ${conflicts.length} potential conflicts`);
    
    const stats: NormalizationStats = {
      total: totalWebsites,
      needsNormalization: preview.length,
      conflicts: conflicts.length,
      normalized: totalWebsites - preview.length,
      errors: 0
    };
    
    return NextResponse.json({
      success: true,
      preview,
      conflicts,
      stats,
      message: conflicts.length > 0 
        ? `⚠️ ${conflicts.length} conflicts detected - manual resolution required`
        : `✅ Ready to normalize ${preview.length} domains`
    });
    
  } catch (error) {
    console.error('Domain normalization preview error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Preview generation failed',
        success: false 
      },
      { status: 500 }
    );
  }
}