import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting semantic audit tables migration...');
    
    // Check if tables already exist first
    const checkSessionsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_sessions'
      ) as exists
    `);
    
    const checkSectionsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_sections'
      ) as exists
    `);

    const sessionsExists = (checkSessionsResult as any)[0]?.exists === true;
    const sectionsExists = (checkSectionsResult as any)[0]?.exists === true;
    
    console.log('Pre-migration check:', { sessionsExists, sectionsExists });

    // Create audit_sessions table
    console.log('Creating audit_sessions table...');
    const sessionsResult = await db.execute(sql`
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
    console.log('audit_sessions result:', sessionsResult);

    // Create audit_sections table
    console.log('Creating audit_sections table...');
    const sectionsResult = await db.execute(sql`
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
    console.log('audit_sections result:', sectionsResult);

    // Wait a moment for the transactions to commit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify tables were created - try multiple times if needed
    let finalSessionsExists = false;
    let finalSectionsExists = false;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`Verification attempt ${attempt + 1}...`);
      
      try {
        const finalCheckSessions = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'audit_sessions'
          ) as exists
        `);
        
        const finalCheckSections = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'audit_sections'
          ) as exists
        `);

        finalSessionsExists = (finalCheckSessions as any)[0]?.exists === true;
        finalSectionsExists = (finalCheckSections as any)[0]?.exists === true;
        
        console.log(`Attempt ${attempt + 1} verification:`, { finalSessionsExists, finalSectionsExists });
        
        if (finalSessionsExists && finalSectionsExists) {
          break; // Success!
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (verifyError) {
        console.error(`Verification attempt ${attempt + 1} failed:`, verifyError);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Skip information_schema verification - use direct table access instead
    console.log('Skipping information_schema verification, using direct table access...');
    
    try {
      await db.execute(sql`SELECT 1 FROM audit_sessions LIMIT 1`);
      finalSessionsExists = true;
      console.log('✅ Direct query confirms: audit_sessions table exists and is accessible');
    } catch (error) {
      console.error('❌ Direct query failed: audit_sessions table not accessible:', error);
      throw new Error(`audit_sessions table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      await db.execute(sql`SELECT 1 FROM audit_sections LIMIT 1`);
      finalSectionsExists = true;
      console.log('✅ Direct query confirms: audit_sections table exists and is accessible');
    } catch (error) {
      console.error('❌ Direct query failed: audit_sections table not accessible:', error);
      throw new Error(`audit_sections table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('Semantic audit tables created successfully');

    return NextResponse.json({
      success: true,
      message: 'Semantic audit tables created successfully',
      details: {
        sessionsExists: finalSessionsExists,
        sectionsExists: finalSectionsExists
      }
    });

  } catch (error) {
    console.error('Error creating semantic audit tables:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create semantic audit tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        fullError: error instanceof Error ? error.stack : error
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