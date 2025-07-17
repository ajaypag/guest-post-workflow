import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🚀 Starting outline_sessions table migration...');

    // Create the outline_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS outline_sessions (
        id UUID PRIMARY KEY,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        outline_prompt TEXT,
        clarification_questions JSONB,
        clarification_answers TEXT,
        agent_state JSONB,
        final_outline TEXT,
        citations JSONB,
        error_message TEXT,
        session_metadata JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table created successfully');

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_outline_sessions_workflow_id 
      ON outline_sessions(workflow_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_outline_sessions_status 
      ON outline_sessions(status)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_outline_sessions_version 
      ON outline_sessions(workflow_id, version DESC)
    `);

    console.log('✅ Indexes created successfully');

    // Verify the table structure
    const tableInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'outline_sessions'
      ORDER BY ordinal_position
    `);

    console.log('📋 Table structure:', tableInfo.rows);

    return NextResponse.json({
      success: true,
      message: 'Outline sessions table migration completed successfully',
      tableStructure: tableInfo.rows
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('🚨 Starting outline_sessions table rollback...');

    // Drop indexes first
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_outline_sessions_version
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_outline_sessions_status
    `);
    
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_outline_sessions_workflow_id
    `);

    console.log('✅ Indexes dropped');

    // Drop the table
    await db.execute(sql`
      DROP TABLE IF EXISTS outline_sessions CASCADE
    `);

    console.log('✅ Table dropped successfully');

    return NextResponse.json({
      success: true,
      message: 'Outline sessions table rollback completed successfully'
    });

  } catch (error: any) {
    console.error('❌ Rollback error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}