import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if migration has been applied by verifying schema changes
    const checks = {
      clientIdNullable: false,
      ownerUserIdExists: false,
      workflowIdExists: false,
      sourceTypeExists: false,
      createdInWorkflowExists: false,
      expiresAtExists: false,
    };

    // Check if clientId is nullable
    const clientIdCheck = await db.execute(sql`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'target_pages'
      AND column_name = 'client_id'
    `);
    checks.clientIdNullable = clientIdCheck.rows[0]?.is_nullable === 'YES';

    // Check for new columns
    const columnCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'target_pages'
      AND column_name IN ('owner_user_id', 'workflow_id', 'source_type', 'created_in_workflow', 'expires_at')
    `);

    columnCheck.rows.forEach((row: any) => {
      switch (row.column_name) {
        case 'owner_user_id':
          checks.ownerUserIdExists = true;
          break;
        case 'workflow_id':
          checks.workflowIdExists = true;
          break;
        case 'source_type':
          checks.sourceTypeExists = true;
          break;
        case 'created_in_workflow':
          checks.createdInWorkflowExists = true;
          break;
        case 'expires_at':
          checks.expiresAtExists = true;
          break;
      }
    });

    // Overall status - migration is applied if all checks pass
    const isApplied = Object.values(checks).every(check => check === true);

    return NextResponse.json({
      isApplied,
      checks,
      migrationName: '0005_add_orphan_url_support',
      description: 'Adds support for orphan URLs and workflow-scoped URLs'
    });

  } catch (error) {
    console.error('Error checking bulk URL migration:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}