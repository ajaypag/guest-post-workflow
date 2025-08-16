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

    console.log('Adding offering_name column to publisher_offerings table');

    // Add the column
    await db.execute(sql`
      ALTER TABLE publisher_offerings 
      ADD COLUMN IF NOT EXISTS offering_name VARCHAR(255)
    `);

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN publisher_offerings.offering_name IS 'Custom name for the offering'
    `);

    // Verify the column was added
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'publisher_offerings'
      AND column_name = 'offering_name'
    `);

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0052_add_offering_name_column', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully added offering_name column',
      details: {
        column: columnInfo.rows[0] || 'Column added'
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