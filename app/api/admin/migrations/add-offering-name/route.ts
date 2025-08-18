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

    // First check if the table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'publisher_offerings'
      ) as table_exists
    `);

    if (!tableCheck.rows[0]?.table_exists) {
      throw new Error('Table publisher_offerings does not exist. Run the Publisher Offerings System migration first.');
    }

    // Check if column already exists
    const existingColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'publisher_offerings'
      AND column_name = 'offering_name'
    `);

    let wasAdded = false;
    if (existingColumn.rows.length === 0) {
      console.log('Column does not exist, adding it now...');
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE publisher_offerings 
        ADD COLUMN offering_name VARCHAR(255)
      `);
      
      wasAdded = true;
      console.log('Column added successfully');
    } else {
      console.log('Column already exists');
    }

    // Add or update comment
    await db.execute(sql`
      COMMENT ON COLUMN publisher_offerings.offering_name IS 'Custom name for the offering'
    `);

    // Verify the column now exists
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'publisher_offerings'
      AND column_name = 'offering_name'
    `);

    if (columnInfo.rows.length === 0) {
      throw new Error('Failed to add offering_name column - column still does not exist after ALTER TABLE');
    }

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0052_add_offering_name_column', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: wasAdded ? 'Successfully added offering_name column' : 'Column already exists',
      details: {
        wasAdded,
        column: columnInfo.rows[0]
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