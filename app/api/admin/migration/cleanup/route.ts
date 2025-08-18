import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { updateMigrationState } from '../status/route';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      migrationRecordDeleted: false,
      message: '',
      details: {} as any
    };

    // Delete the migration record if it exists
    try {
      const deleteResult = await db.execute(sql`
        DELETE FROM migrations 
        WHERE name = '0056_production_lineitems_migration'
        RETURNING name, applied_at
      `);
      
      if (deleteResult.rows.length > 0) {
        results.migrationRecordDeleted = true;
        results.message = 'Migration record cleared. You can now re-run the migration.';
        results.details.deletedRecord = deleteResult.rows[0];
      } else {
        results.message = 'No migration record found to clear.';
      }
    } catch (error: any) {
      results.message = `Failed to clear migration record: ${error.message}`;
      return NextResponse.json(results, { status: 500 });
    }

    // Check current state
    try {
      // Check if columns exist (from partial migration)
      const columnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_line_items' 
        AND column_name IN ('assigned_at', 'assigned_by', 'service_fee', 'modified_at')
      `);
      results.details.existingColumns = columnCheck.rows.map((r: any) => r.column_name);
      
      // Check if indexes exist
      const indexCheck = await db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'order_line_items'
        AND indexname LIKE 'line_items_%'
      `);
      results.details.existingIndexes = indexCheck.rows.map((r: any) => r.indexname);
      
      // Count any line items that might have been created
      const lineItemCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM order_line_items
      `);
      results.details.lineItemCount = parseInt((lineItemCount.rows[0] as any).count);
      
    } catch (error) {
      // Ignore errors in state checking
    }

    // Reset migration state
    updateMigrationState({
      phase: 'pre-migration',
      currentStep: 'Ready to start (cleaned)',
      progress: 0,
      errors: [],
      startedAt: null,
      completedAt: null
    });

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('Migration cleanup error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Cleanup failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if cleanup is needed
    const migrationCheck = await db.execute(sql`
      SELECT name, applied_at 
      FROM migrations 
      WHERE name = '0056_production_lineitems_migration'
    `);

    const needsCleanup = migrationCheck.rows.length > 0;

    return NextResponse.json({
      needsCleanup,
      migrationRecord: migrationCheck.rows[0] || null,
      message: needsCleanup 
        ? 'Migration record exists. Cleanup may be needed if migration failed.'
        : 'No cleanup needed.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check cleanup status' },
      { status: 500 }
    );
  }
}