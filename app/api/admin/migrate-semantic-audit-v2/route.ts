import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

// Note: We're using the existing v2_agent_sessions table since it's already set up
// for V2 workflows. The stepId='content-audit' differentiates semantic audit sessions.

export async function GET() {
  try {
    // Check if v2_agent_sessions table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'v2_agent_sessions'
      );
    `);

    // Check for any existing V2 semantic audit sessions
    const sessionCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM v2_agent_sessions 
      WHERE step_id = 'content-audit'
    `);

    // Get column information
    const columns = await db.execute(sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'v2_agent_sessions'
      ORDER BY ordinal_position;
    `);

    return NextResponse.json({
      exists: tableExists.rows[0].exists,
      sessionCount: parseInt(String(sessionCount.rows[0].count)),
      columns: columns.rows,
      message: tableExists.rows[0].exists 
        ? 'V2 agent sessions table exists and is ready for semantic audit V2'
        : 'V2 agent sessions table does not exist'
    });

  } catch (error) {
    console.error('Error checking V2 semantic audit tables:', error);
    return NextResponse.json({ 
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // V2 agent sessions table should already exist from article V2
    // Just verify it has the correct structure
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'v2_agent_sessions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create the table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS v2_agent_sessions (
          id UUID PRIMARY KEY,
          workflow_id UUID NOT NULL,
          version INTEGER NOT NULL,
          step_id VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          outline TEXT,
          total_sections INTEGER,
          completed_sections INTEGER,
          current_word_count INTEGER,
          total_word_count INTEGER,
          final_article TEXT,
          session_metadata JSONB,
          error_message TEXT,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );
      `);

      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_v2_sessions_workflow 
        ON v2_agent_sessions(workflow_id);
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_v2_sessions_step 
        ON v2_agent_sessions(step_id);
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_v2_sessions_status 
        ON v2_agent_sessions(status);
      `);
    }

    return NextResponse.json({ 
      success: true,
      message: 'V2 semantic audit tables ready' 
    });

  } catch (error) {
    console.error('Error creating V2 semantic audit tables:', error);
    return NextResponse.json({ 
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Only delete semantic audit V2 sessions, not article V2 sessions
    const result = await db.execute(sql`
      DELETE FROM v2_agent_sessions 
      WHERE step_id = 'content-audit'
    `);

    return NextResponse.json({ 
      success: true,
      message: `Removed ${result.rowCount} semantic audit V2 sessions`
    });

  } catch (error) {
    console.error('Error removing V2 semantic audit sessions:', error);
    return NextResponse.json({ 
      error: 'Failed to remove sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}