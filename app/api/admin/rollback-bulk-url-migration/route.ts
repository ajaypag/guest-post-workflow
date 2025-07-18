import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Note: This is an admin-only endpoint for database migration rollback
    // In a production environment, you would add proper authentication here

    console.log('🔧 Rolling back bulk URL migration...');

    const steps = [];

    // Step 1: Drop indexes
    const indexes = ['idx_target_pages_orphan', 'idx_target_pages_workflow'];
    for (const indexName of indexes) {
      try {
        await db.execute(sql.raw(`DROP INDEX IF EXISTS ${indexName}`));
        steps.push({ step: `Drop index ${indexName}`, success: true });
      } catch (e) {
        steps.push({ step: `Drop index ${indexName}`, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    // Step 2: Drop constraint
    try {
      await db.execute(sql`ALTER TABLE target_pages DROP CONSTRAINT IF EXISTS chk_source_type`);
      steps.push({ step: 'Drop source_type constraint', success: true });
    } catch (e) {
      steps.push({ step: 'Drop source_type constraint', success: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }

    // Step 3: Remove orphan URLs (where client_id is NULL)
    try {
      const result = await db.execute(sql`DELETE FROM target_pages WHERE client_id IS NULL`);
      steps.push({ 
        step: 'Remove orphan URLs', 
        success: true,
        deletedCount: result.rowCount || 0
      });
    } catch (e) {
      steps.push({ step: 'Remove orphan URLs', success: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }

    // Step 4: Drop columns
    const columnsToRemove = ['owner_user_id', 'workflow_id', 'source_type', 'created_in_workflow', 'expires_at'];
    for (const columnName of columnsToRemove) {
      try {
        await db.execute(sql.raw(`ALTER TABLE target_pages DROP COLUMN IF EXISTS ${columnName}`));
        steps.push({ step: `Drop column ${columnName}`, success: true });
      } catch (e) {
        steps.push({ step: `Drop column ${columnName}`, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    // Step 5: Make clientId NOT NULL again
    try {
      await db.execute(sql`ALTER TABLE target_pages ALTER COLUMN client_id SET NOT NULL`);
      steps.push({ step: 'Make clientId NOT NULL', success: true });
    } catch (e) {
      steps.push({ step: 'Make clientId NOT NULL', success: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }

    const allSuccess = steps.every(s => s.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'Migration rolled back successfully' : 'Some rollback steps failed',
      steps
    });

  } catch (error) {
    console.error('Migration rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback migration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}