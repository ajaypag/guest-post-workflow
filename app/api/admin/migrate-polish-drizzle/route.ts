import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting polish tables migration using Drizzle...');
    
    // Use Drizzle's table creation approach
    // This ensures the tables match the schema exactly
    
    // First, check if tables exist
    const tablesExist = await checkTablesExist();
    
    if (tablesExist.sessions && tablesExist.sections) {
      return NextResponse.json({
        success: true,
        message: 'Polish tables already exist',
        details: tablesExist
      });
    }
    
    // Create tables using raw SQL that matches Drizzle's expectations
    const results = await createTables();
    
    // Verify creation
    const finalCheck = await checkTablesExist();
    
    if (!finalCheck.sessions || !finalCheck.sections) {
      throw new Error('Tables were not created successfully');
    }
    
    // Test insert to make sure everything works
    const testResult = await testInsert();
    
    return NextResponse.json({
      success: true,
      message: 'Polish tables created and tested successfully',
      details: {
        ...finalCheck,
        testInsert: testResult
      }
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}

async function checkTablesExist() {
  try {
    // Try to query each table
    let sessionsExists = false;
    let sectionsExists = false;
    
    try {
      await db.select({ count: sql<number>`count(*)` }).from(polishSessions).limit(1);
      sessionsExists = true;
    } catch (e) {
      console.log('polish_sessions does not exist');
    }
    
    try {
      await db.select({ count: sql<number>`count(*)` }).from(polishSections).limit(1);
      sectionsExists = true;
    } catch (e) {
      console.log('polish_sections does not exist');
    }
    
    return { sessions: sessionsExists, sections: sectionsExists };
  } catch (error) {
    console.error('Error checking tables:', error);
    return { sessions: false, sections: false };
  }
}

async function createTables() {
  // Create tables with explicit column definitions matching the schema
  
  // polish_sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS polish_sessions (
      id UUID PRIMARY KEY,
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      step_id VARCHAR(100) NOT NULL DEFAULT 'final-polish',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      total_sections INTEGER DEFAULT 0,
      completed_sections INTEGER DEFAULT 0,
      original_article TEXT,
      research_context TEXT,
      brand_conflicts_found INTEGER DEFAULT 0,
      polish_metadata JSONB,
      error_message TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `);
  
  console.log('Created polish_sessions table');
  
  // polish_sections table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS polish_sections (
      id UUID PRIMARY KEY,
      polish_session_id UUID NOT NULL REFERENCES polish_sessions(id) ON DELETE CASCADE,
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      section_number INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      original_content TEXT,
      polished_content TEXT,
      strengths TEXT,
      weaknesses TEXT,
      brand_conflicts TEXT,
      polish_approach VARCHAR(100),
      engagement_score INTEGER,
      clarity_score INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      polish_metadata JSONB,
      error_message TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `);
  
  console.log('Created polish_sections table');
  
  return { sessions: true, sections: true };
}

async function testInsert() {
  try {
    // Get a real workflow to test with
    const testWorkflow = await db.execute(sql`
      SELECT id FROM workflows LIMIT 1
    `);
    
    if (!testWorkflow || (testWorkflow as any).rows?.length === 0) {
      return { tested: false, reason: 'No workflows found to test with' };
    }
    
    const workflowId = (testWorkflow as any).rows[0].id;
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    // Test insert into polish_sessions
    await db.insert(polishSessions).values({
      id: sessionId,
      workflowId: workflowId,
      version: 999,
      stepId: 'final-polish',
      status: 'test',
      totalSections: 0,
      completedSections: 0,
      originalArticle: 'Test article',
      researchContext: 'Test context',
      brandConflictsFound: 0,
      polishMetadata: { test: true },
      errorMessage: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    });
    
    // Test insert into polish_sections
    await db.insert(polishSections).values({
      id: crypto.randomUUID(),
      polishSessionId: sessionId,
      workflowId: workflowId,
      version: 999,
      sectionNumber: 1,
      title: 'Test Section',
      originalContent: 'Test original',
      polishedContent: 'Test polished',
      strengths: 'Test strengths',
      weaknesses: 'Test weaknesses',
      brandConflicts: 'Test conflicts',
      polishApproach: 'test',
      engagementScore: 8,
      clarityScore: 9,
      status: 'test',
      polishMetadata: { test: true },
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    });
    
    // Clean up test data
    await db.delete(polishSections).where(sql`polish_session_id = ${sessionId}`);
    await db.delete(polishSessions).where(sql`id = ${sessionId}`);
    
    return { tested: true, success: true };
    
  } catch (error: any) {
    console.error('Test insert failed:', error);
    return { tested: true, success: false, error: error.message };
  }
}

export async function DELETE() {
  try {
    // Drop tables in correct order
    await db.execute(sql`DROP TABLE IF EXISTS polish_sections CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS polish_sessions CASCADE`);
    
    return NextResponse.json({
      success: true,
      message: 'Polish tables dropped successfully'
    });
    
  } catch (error: any) {
    console.error('Error dropping tables:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}