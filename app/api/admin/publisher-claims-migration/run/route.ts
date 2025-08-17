import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Run the migration
    await db.execute(sql`
      ALTER TABLE publisher_email_claims 
      ADD COLUMN IF NOT EXISTS claim_confidence VARCHAR(50),
      ADD COLUMN IF NOT EXISTS claim_source VARCHAR(100)
    `);

    // Update existing records with default values
    const updateResult = await db.execute(sql`
      UPDATE publisher_email_claims 
      SET 
        claim_confidence = COALESCE(claim_confidence, 'unknown'),
        claim_source = COALESCE(claim_source, 'manual')
      WHERE claim_confidence IS NULL OR claim_source IS NULL
      RETURNING id
    `);

    const updatedCount = (updateResult as any).rows.length;

    // Verify the migration
    const verifyResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'publisher_email_claims'
        AND column_name IN ('claim_confidence', 'claim_source')
      ORDER BY column_name
    `);

    const columns = (verifyResult as any).rows;
    const success = columns.length === 2;

    // Get final stats
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(claim_confidence) as with_confidence,
        COUNT(claim_source) as with_source
      FROM publisher_email_claims
    `);

    const stats = (statsResult as any).rows[0];

    return NextResponse.json({
      success,
      message: success 
        ? 'Migration completed successfully' 
        : 'Migration partially completed - please check manually',
      columnsAdded: columns,
      recordsUpdated: updatedCount,
      stats: {
        totalClaims: stats.total_claims,
        claimsWithConfidence: stats.with_confidence,
        claimsWithSource: stats.with_source
      }
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    
    // Check if it's just because columns already exist
    if (error.message?.includes('already exists') || error.code === '42701') {
      return NextResponse.json({
        success: true,
        message: 'Columns already exist - no migration needed',
        alreadyMigrated: true
      });
    }

    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
}