import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Create audit_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_sessions (
        id UUID PRIMARY KEY,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        step_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        total_sections INTEGER DEFAULT 0,
        completed_sections INTEGER DEFAULT 0,
        total_citations_used INTEGER DEFAULT 0,
        original_article TEXT,
        research_outline TEXT,
        audit_metadata JSONB,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    // Create audit_sections table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_sections (
        id UUID PRIMARY KEY,
        audit_session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        section_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        original_content TEXT,
        audited_content TEXT,
        strengths TEXT,
        weaknesses TEXT,
        editing_pattern VARCHAR(100),
        citations_added INTEGER DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        audit_metadata JSONB,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    console.log('Semantic audit tables created successfully');

    return NextResponse.json({
      success: true,
      message: 'Semantic audit tables created successfully'
    });

  } catch (error) {
    console.error('Error creating semantic audit tables:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create semantic audit tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Drop audit_sections first (has foreign key to audit_sessions)
    await db.execute(sql`DROP TABLE IF EXISTS audit_sections CASCADE`);
    
    // Drop audit_sessions
    await db.execute(sql`DROP TABLE IF EXISTS audit_sessions CASCADE`);

    console.log('Semantic audit tables removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Semantic audit tables removed successfully'
    });

  } catch (error) {
    console.error('Error removing semantic audit tables:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove semantic audit tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}