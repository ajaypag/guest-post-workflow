import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Create migrations tracking table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        execution_time_ms INTEGER,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        applied_by VARCHAR(255)
      )
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history(migration_name)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_migration_history_executed ON migration_history(executed_at DESC)
    `);

    // Insert this migration as the first entry
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by) 
      VALUES ('0000_create_migrations_table', true, 'system')
      ON CONFLICT (migration_name) DO NOTHING
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration history table created successfully'
    });

  } catch (error: any) {
    console.error('Failed to create migration history table:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create migration history table'
    }, { status: 500 });
  }
}