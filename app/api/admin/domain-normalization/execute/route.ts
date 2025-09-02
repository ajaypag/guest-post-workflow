import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

interface NormalizationStats {
  total: number;
  needsNormalization: number;
  conflicts: number;
  normalized: number;
  errors: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting domain normalization execution...');
    
    // First, do a final conflict check
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
      SELECT COUNT(*) as conflict_count
      FROM normalized n
      JOIN websites w ON w.domain = n.normalized_domain
      WHERE w.id != n.id
    `);
    
    const conflictCount = (conflictResult.rows[0] as any).conflict_count;
    
    if (conflictCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot proceed - ${conflictCount} conflicts detected. Run preview to see conflicts.`,
          success: false 
        },
        { status: 400 }
      );
    }
    
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
    
    const results: string[] = [];
    let normalizedCount = 0;
    let errorCount = 0;
    
    console.log(`Found ${unnormalizedResult.rows.length} domains to normalize`);
    results.push(`🔄 Starting normalization of ${unnormalizedResult.rows.length} domains...`);
    
    // Normalize each domain
    for (const row of unnormalizedResult.rows) {
      const website = row as any;
      
      try {
        await db.execute(sql`
          UPDATE websites 
          SET 
            domain = ${website.normalized_domain},
            updated_at = NOW()
          WHERE id = ${website.id}
        `);
        
        const resultMessage = `✅ ${website.domain} → ${website.normalized_domain}`;
        console.log(resultMessage);
        results.push(resultMessage);
        normalizedCount++;
        
      } catch (error) {
        const errorMessage = `❌ Failed to normalize ${website.domain}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        results.push(errorMessage);
        errorCount++;
      }
    }
    
    // Get final stats
    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM websites`);
    const totalWebsites = (totalResult.rows[0] as any).count;
    
    // Check remaining unnormalized
    const remainingResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE 
        domain LIKE 'www.%' 
        OR domain LIKE 'WWW.%'
        OR domain LIKE 'http://%'
        OR domain LIKE 'https://%'
        OR domain LIKE '%/'
        OR domain != lower(trim(domain))
    `);
    
    const remainingCount = (remainingResult.rows[0] as any).count;
    
    const stats: NormalizationStats = {
      total: totalWebsites,
      needsNormalization: remainingCount,
      conflicts: 0,
      normalized: normalizedCount,
      errors: errorCount
    };
    
    const summaryMessages = [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📊 Normalization Summary:',
      `   ✅ Successfully normalized: ${normalizedCount} domains`,
      `   ❌ Errors: ${errorCount} domains`,
      `   📋 Total processed: ${normalizedCount + errorCount} domains`,
      `   📈 Remaining unnormalized: ${remainingCount} domains`,
      ''
    ];
    
    results.push(...summaryMessages);
    
    if (remainingCount === 0) {
      results.push('🎉 Perfect! All domains are now normalized.');
      results.push('✅ ManyReach duplicate detection should now work correctly!');
    } else {
      results.push(`⚠️ ${remainingCount} domains still need normalization. Check for edge cases.`);
    }
    
    console.log(`✅ Normalization complete: ${normalizedCount} normalized, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      results,
      stats,
      message: errorCount === 0 
        ? `✅ Successfully normalized ${normalizedCount} domains!`
        : `⚠️ Normalized ${normalizedCount} domains with ${errorCount} errors`
    });
    
  } catch (error) {
    console.error('Domain normalization execution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Normalization failed',
        success: false 
      },
      { status: 500 }
    );
  }
}