import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Note: This is an admin-only endpoint for database migration
    // In a production environment, you would add proper authentication here

    console.log('🔧 Applying bulk URL migration...');

    const steps = [];

    // Step 1: Make clientId nullable
    try {
      await db.execute(sql`ALTER TABLE target_pages ALTER COLUMN client_id DROP NOT NULL`);
      steps.push({ step: 'Make clientId nullable', success: true });
    } catch (e) {
      steps.push({ step: 'Make clientId nullable', success: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }

    // Step 2: Add new columns
    const newColumns = [
      { name: 'owner_user_id', type: 'uuid REFERENCES users(id)' },
      { name: 'workflow_id', type: 'uuid REFERENCES workflows(id)' },
      { name: 'source_type', type: "varchar(50) DEFAULT 'client_managed'" },
      { name: 'created_in_workflow', type: 'boolean DEFAULT false' },
      { name: 'expires_at', type: 'timestamp' }
    ];

    for (const column of newColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE target_pages ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`));
        steps.push({ step: `Add column ${column.name}`, success: true });
      } catch (e) {
        steps.push({ step: `Add column ${column.name}`, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    // Step 3: Add indexes
    const indexes = [
      {
        name: 'idx_target_pages_orphan',
        definition: 'CREATE INDEX IF NOT EXISTS idx_target_pages_orphan ON target_pages (owner_user_id) WHERE client_id IS NULL'
      },
      {
        name: 'idx_target_pages_workflow',
        definition: 'CREATE INDEX IF NOT EXISTS idx_target_pages_workflow ON target_pages (workflow_id) WHERE client_id IS NULL'
      }
    ];

    for (const index of indexes) {
      try {
        await db.execute(sql.raw(index.definition));
        steps.push({ step: `Create index ${index.name}`, success: true });
      } catch (e) {
        steps.push({ step: `Create index ${index.name}`, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    // Step 4: Add constraint
    try {
      await db.execute(sql`
        ALTER TABLE target_pages 
        ADD CONSTRAINT chk_source_type 
        CHECK (source_type IN ('client_managed', 'workflow_temporary', 'bulk_import', 'user_orphan'))
      `);
      steps.push({ step: 'Add source_type constraint', success: true });
    } catch (e) {
      // Constraint might already exist
      steps.push({ step: 'Add source_type constraint', success: false, error: e instanceof Error ? e.message : 'Already exists or error' });
    }

    const allSuccess = steps.every(s => s.success || s.error?.includes('already exists'));

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'Migration applied successfully' : 'Some migration steps failed',
      steps
    });

  } catch (error) {
    console.error('Migration application error:', error);
    return NextResponse.json(
      { error: 'Failed to apply migration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}