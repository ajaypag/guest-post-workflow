import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if the columns exist
    const result = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'publisher_email_claims'
        AND column_name IN ('claim_confidence', 'claim_source')
      ORDER BY column_name
    `);

    const existingColumns = (result as any).rows.map((r: any) => r.column_name);
    const hasClaimConfidence = existingColumns.includes('claim_confidence');
    const hasClaimSource = existingColumns.includes('claim_source');
    const migrationNeeded = !hasClaimConfidence || !hasClaimSource;

    // Get count of existing claims
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM publisher_email_claims
    `);
    const claimsCount = (countResult as any).rows[0].count;

    // Check if any claims have null values (if columns exist)
    let nullCount = 0;
    if (!migrationNeeded) {
      const nullResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM publisher_email_claims 
        WHERE claim_confidence IS NULL OR claim_source IS NULL
      `);
      nullCount = (nullResult as any).rows[0].count;
    }

    return NextResponse.json({
      migrationNeeded,
      columns: {
        claim_confidence: hasClaimConfidence,
        claim_source: hasClaimSource
      },
      existingColumns: (result as any).rows,
      stats: {
        totalClaims: claimsCount,
        claimsWithNullValues: nullCount
      },
      message: migrationNeeded 
        ? 'Migration needed: Some columns are missing' 
        : 'No migration needed: All columns exist'
    });
  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}