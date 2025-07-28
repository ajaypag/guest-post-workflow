import { NextResponse } from 'next/server';
import { db } from '@/db/database';
import { bulkAnalysis } from '@/db/schema/bulkAnalysisSchema';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Step 1: Add new columns if they don't exist
    const columnsToAdd = [
      { name: 'overlap_status', type: 'VARCHAR(10)' },
      { name: 'authority_direct', type: 'VARCHAR(10)' },
      { name: 'authority_related', type: 'VARCHAR(10)' },
      { name: 'topic_scope', type: 'VARCHAR(20)' },
      { name: 'topic_reasoning', type: 'TEXT' },
      { name: 'evidence', type: 'JSON' }
    ];

    const addedColumns: string[] = [];

    for (const column of columnsToAdd) {
      try {
        await db.execute(sql.raw(`
          ALTER TABLE bulk_analysis 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `));
        addedColumns.push(column.name);
      } catch (error) {
        console.error(`Error adding column ${column.name}:`, error);
        // Continue with other columns even if one fails
      }
    }

    // Step 2: Update average_quality to marginal_quality
    const updateResult = await db.execute(sql`
      UPDATE bulk_analysis 
      SET qualification_status = 'marginal_quality'
      WHERE qualification_status = 'average_quality'
    `);

    // Get count of updated records
    const recordsUpdated = updateResult.rowCount || 0;

    // Step 3: Verify the migration
    const verificationResult = await db.execute(sql`
      SELECT 
        qualification_status,
        COUNT(*) as count
      FROM bulk_analysis
      WHERE qualification_status IS NOT NULL
      GROUP BY qualification_status
      ORDER BY qualification_status
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columnsAdded: addedColumns,
      recordsUpdated: recordsUpdated,
      currentDistribution: verificationResult.rows
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}