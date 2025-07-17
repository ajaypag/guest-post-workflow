import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if the new columns exist
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'outline_sessions' 
      AND column_name IN ('background_response_id', 'polling_attempts', 'last_polled_at', 'is_active')
    `);

    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['background_response_id', 'polling_attempts', 'last_polled_at', 'is_active'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    return NextResponse.json({
      success: true,
      columnsExist: missingColumns.length === 0,
      existingColumns,
      missingColumns
    });
  } catch (error: any) {
    console.error('Error checking outline background columns:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running migration for outline background mode columns...');

    // Add the new columns
    await db.execute(sql`
      ALTER TABLE outline_sessions 
      ADD COLUMN IF NOT EXISTS background_response_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS polling_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE
    `);

    // Add indexes for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_outline_sessions_response_id 
      ON outline_sessions(background_response_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_outline_sessions_active 
      ON outline_sessions(workflow_id, is_active) 
      WHERE is_active = TRUE
    `);

    console.log('✅ Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Background mode columns added to outline_sessions table'
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 Rolling back outline background mode columns...');

    // Drop the indexes first
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_outline_sessions_response_id
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_outline_sessions_active
    `);

    // Remove the columns
    await db.execute(sql`
      ALTER TABLE outline_sessions 
      DROP COLUMN IF EXISTS background_response_id,
      DROP COLUMN IF EXISTS polling_attempts,
      DROP COLUMN IF EXISTS last_polled_at,
      DROP COLUMN IF EXISTS is_active
    `);

    console.log('✅ Rollback completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Background mode columns removed from outline_sessions table'
    });
  } catch (error: any) {
    console.error('❌ Rollback failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}