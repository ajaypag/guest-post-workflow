import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('🚀 Starting streaming columns migration...');

    // Add streaming columns to outline_sessions table
    const migrations = [
      {
        name: 'last_sequence_number',
        sql: sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS last_sequence_number INTEGER DEFAULT 0`
      },
      {
        name: 'connection_status', 
        sql: sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50)`
      },
      {
        name: 'stream_started_at',
        sql: sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS stream_started_at TIMESTAMP`
      },
      {
        name: 'partial_content',
        sql: sql`ALTER TABLE outline_sessions ADD COLUMN IF NOT EXISTS partial_content TEXT`
      }
    ];

    const results = [];

    for (const migration of migrations) {
      try {
        await db.execute(migration.sql);
        results.push(`✅ Added column: ${migration.name}`);
        console.log(`✅ Added column: ${migration.name}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          results.push(`ℹ️ Column already exists: ${migration.name}`);
          console.log(`ℹ️ Column already exists: ${migration.name}`);
        } else {
          results.push(`❌ Failed to add column ${migration.name}: ${error.message}`);
          console.error(`❌ Failed to add column ${migration.name}:`, error);
        }
      }
    }

    console.log('✅ Streaming columns migration completed');

    return NextResponse.json({
      success: true,
      message: 'Streaming columns migration completed successfully',
      results,
      columnsAdded: ['last_sequence_number', 'connection_status', 'stream_started_at', 'partial_content']
    });

  } catch (error: any) {
    console.error('❌ Streaming migration failed:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error.message}`,
      details: error
    }, { status: 500 });
  }
}