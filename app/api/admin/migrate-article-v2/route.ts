import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { v2AgentSessions } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Check if v2_agent_sessions table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'v2_agent_sessions'
      );
    `);
    
    const exists = tableCheck.rows[0]?.exists;
    
    if (exists) {
      // Get table info
      const columns = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'v2_agent_sessions'
        ORDER BY ordinal_position;
      `);
      
      const rowCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM v2_agent_sessions;
      `);
      
      return NextResponse.json({
        exists: true,
        columns: columns.rows,
        rowCount: rowCount.rows[0]?.count || 0,
        message: 'V2 Agent Sessions table exists'
      });
    } else {
      return NextResponse.json({
        exists: false,
        message: 'V2 Agent Sessions table does not exist'
      });
    }
  } catch (error: any) {
    console.error('Error checking V2 table:', error);
    return NextResponse.json({ 
      error: error.message,
      exists: false 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Creating v2_agent_sessions table...');
    
    // Create the table with proper column sizes (learning from CLAUDE.md)
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
    
    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v2_agent_sessions_workflow_id 
      ON v2_agent_sessions(workflow_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v2_agent_sessions_status 
      ON v2_agent_sessions(status);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v2_agent_sessions_workflow_version 
      ON v2_agent_sessions(workflow_id, version);
    `);
    
    console.log('✅ V2 Agent Sessions table created successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'V2 Agent Sessions table created successfully'
    });
  } catch (error: any) {
    console.error('Error creating V2 table:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');
    
    if (confirm !== 'true') {
      return NextResponse.json({ 
        error: 'Please confirm deletion by adding ?confirm=true' 
      }, { status: 400 });
    }
    
    console.log('Dropping v2_agent_sessions table...');
    
    // Drop indexes first
    await db.execute(sql`DROP INDEX IF EXISTS idx_v2_agent_sessions_workflow_id;`);
    await db.execute(sql`DROP INDEX IF EXISTS idx_v2_agent_sessions_status;`);
    await db.execute(sql`DROP INDEX IF EXISTS idx_v2_agent_sessions_workflow_version;`);
    
    // Drop the table
    await db.execute(sql`DROP TABLE IF EXISTS v2_agent_sessions;`);
    
    console.log('✅ V2 Agent Sessions table dropped successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'V2 Agent Sessions table dropped successfully'
    });
  } catch (error: any) {
    console.error('Error dropping V2 table:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}