import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { execute } = await request.json();

    if (!execute) {
      return NextResponse.json({ 
        message: 'Dry run - migration not executed',
        description: 'Will make offering_id nullable in publisher_offering_relationships table'
      });
    }

    // Execute migration
    await db.execute(sql`
      -- Make offering_id nullable (it's currently NOT NULL)
      ALTER TABLE publisher_offering_relationships 
      ALTER COLUMN offering_id DROP NOT NULL
    `);

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN publisher_offering_relationships.offering_id IS 
      'Reference to publisher_offerings.id - nullable to allow relationships before offerings are created'
    `);

    // Verify the change
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'publisher_offering_relationships'
      AND column_name = 'offering_id'
    `);

    // Record migration completion (with error handling)
    try {
      await db.execute(sql`
        INSERT INTO migration_history (migration_name, success, applied_by)
        VALUES ('0042_fix_offering_id_nullable', true, 'admin')
        ON CONFLICT (migration_name) DO UPDATE
        SET executed_at = NOW(), success = true
      `);
      console.log('✅ Migration history recorded');
    } catch (historyError) {
      console.error('⚠️ Failed to record migration history:', historyError);
      console.log('Migration succeeded but history not recorded - migration_history table may not exist');
      // Don't fail the migration if history recording fails
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      details: {
        modified: 'publisher_offering_relationships.offering_id',
        change: 'Changed from NOT NULL to nullable',
        verification: columnInfo.rows[0]
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}