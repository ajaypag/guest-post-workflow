import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Create link_orchestration_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS link_orchestration_sessions (
        id UUID PRIMARY KEY,
        workflow_id UUID NOT NULL REFERENCES workflows(id),
        version INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL,
        
        -- Phase tracking
        current_phase INTEGER DEFAULT 1,
        phase1_start TIMESTAMP,
        phase1_complete TIMESTAMP,
        phase2_start TIMESTAMP,
        phase2_complete TIMESTAMP,
        phase3_start TIMESTAMP,
        phase3_complete TIMESTAMP,
        
        -- Article versions
        original_article TEXT NOT NULL,
        article_after_phase1 TEXT,
        article_after_phase2 TEXT,
        final_article TEXT,
        
        -- Input parameters
        target_domain TEXT NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_url TEXT NOT NULL,
        anchor_text VARCHAR(255),
        guest_post_site TEXT NOT NULL,
        target_keyword VARCHAR(255) NOT NULL,
        
        -- Results stored as JSONB
        phase1_results JSONB,
        phase2_results JSONB,
        phase3_results JSONB,
        
        -- Error tracking
        error_message TEXT,
        error_details JSONB,
        
        -- Timestamps
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        failed_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on workflow_id for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_link_orchestration_workflow_id 
      ON link_orchestration_sessions(workflow_id)
    `);

    // Create index on status for filtering
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_link_orchestration_status 
      ON link_orchestration_sessions(status)
    `);

    return NextResponse.json({
      success: true,
      message: 'Link orchestration table created successfully'
    });
  } catch (error) {
    console.error('Error creating link orchestration table:', error);
    return NextResponse.json({
      error: 'Failed to create link orchestration table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Drop the table
    await db.execute(sql`
      DROP TABLE IF EXISTS link_orchestration_sessions CASCADE
    `);

    return NextResponse.json({
      success: true,
      message: 'Link orchestration table dropped successfully'
    });
  } catch (error) {
    console.error('Error dropping link orchestration table:', error);
    return NextResponse.json({
      error: 'Failed to drop link orchestration table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}