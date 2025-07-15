import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('=== STARTING SEMANTIC MIGRATION DEEP TEST ===');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      steps: [] as any[],
      finalStatus: {
        sessionsExists: false,
        sectionsExists: false,
        migrationNeeded: true
      }
    };

    // Step 1: Check current state
    console.log('Step 1: Checking current table state...');
    try {
      const sessionsCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_sessions'
        ) as exists
      `);
      
      const sectionsCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_sections'
        ) as exists
      `);

      const currentState = {
        sessionsExists: (sessionsCheck as any)[0]?.exists === true,
        sectionsExists: (sectionsCheck as any)[0]?.exists === true
      };

      testResults.steps.push({
        step: 1,
        action: 'Check current state',
        result: currentState,
        success: true
      });

      console.log('Current state:', currentState);
    } catch (error) {
      testResults.steps.push({
        step: 1,
        action: 'Check current state',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }

    // Step 2: Try creating audit_sessions table
    console.log('Step 2: Attempting to create audit_sessions table...');
    try {
      const createSessionsResult = await db.execute(sql`
        CREATE TABLE IF NOT EXISTS audit_sessions (
          id UUID PRIMARY KEY,
          workflow_id UUID NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          step_id VARCHAR(100) NOT NULL,
          audit_type VARCHAR(50) DEFAULT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          total_sections INTEGER DEFAULT 0,
          completed_sections INTEGER DEFAULT 0,
          total_citations_used INTEGER DEFAULT 0,
          total_proceed_steps INTEGER DEFAULT 0,
          completed_proceed_steps INTEGER DEFAULT 0,
          total_cleanup_steps INTEGER DEFAULT 0,
          completed_cleanup_steps INTEGER DEFAULT 0,
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

      testResults.steps.push({
        step: 2,
        action: 'Create audit_sessions table',
        result: {
          command: createSessionsResult.command,
          rowCount: createSessionsResult.rowCount
        },
        success: true
      });

      console.log('audit_sessions creation result:', createSessionsResult);
    } catch (error) {
      testResults.steps.push({
        step: 2,
        action: 'Create audit_sessions table',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      console.error('audit_sessions creation failed:', error);
    }

    // Step 3: Try creating audit_sections table
    console.log('Step 3: Attempting to create audit_sections table...');
    try {
      const createSectionsResult = await db.execute(sql`
        CREATE TABLE IF NOT EXISTS audit_sections (
          id UUID PRIMARY KEY,
          audit_session_id UUID NOT NULL,
          workflow_id UUID NOT NULL,
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

      testResults.steps.push({
        step: 3,
        action: 'Create audit_sections table',
        result: {
          command: createSectionsResult.command,
          rowCount: createSectionsResult.rowCount
        },
        success: true
      });

      console.log('audit_sections creation result:', createSectionsResult);
    } catch (error) {
      testResults.steps.push({
        step: 3,
        action: 'Create audit_sections table',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      console.error('audit_sections creation failed:', error);
    }

    // Step 4: Wait and verify
    console.log('Step 4: Waiting 2 seconds then verifying...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const finalSessionsCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_sessions'
        ) as exists
      `);
      
      const finalSectionsCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_sections'
        ) as exists
      `);

      const finalState = {
        sessionsExists: (finalSessionsCheck as any)[0]?.exists === true,
        sectionsExists: (finalSectionsCheck as any)[0]?.exists === true
      };

      testResults.finalStatus = {
        ...finalState,
        migrationNeeded: !finalState.sessionsExists || !finalState.sectionsExists
      };

      testResults.steps.push({
        step: 4,
        action: 'Final verification',
        result: finalState,
        success: true
      });

      console.log('Final verification:', finalState);
    } catch (error) {
      testResults.steps.push({
        step: 4,
        action: 'Final verification',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }

    // Step 5: Try direct table queries
    console.log('Step 5: Testing direct table access...');
    const directTests = [];

    try {
      const sessionsTest = await db.execute(sql`SELECT 1 FROM audit_sessions LIMIT 1`);
      directTests.push({ table: 'audit_sessions', accessible: true });
    } catch (error) {
      directTests.push({ 
        table: 'audit_sessions', 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    try {
      const sectionsTest = await db.execute(sql`SELECT 1 FROM audit_sections LIMIT 1`);
      directTests.push({ table: 'audit_sections', accessible: true });
    } catch (error) {
      directTests.push({ 
        table: 'audit_sections', 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    testResults.steps.push({
      step: 5,
      action: 'Direct table access test',
      result: directTests,
      success: true
    });

    console.log('=== SEMANTIC MIGRATION DEEP TEST COMPLETE ===');

    return NextResponse.json({
      success: true,
      message: 'Deep semantic migration test completed',
      testResults,
      summary: {
        totalSteps: testResults.steps.length,
        successfulSteps: testResults.steps.filter(s => s.success).length,
        finalTablesExist: testResults.finalStatus.sessionsExists && testResults.finalStatus.sectionsExists,
        migrationNeeded: testResults.finalStatus.migrationNeeded
      }
    });

  } catch (error) {
    console.error('Deep semantic migration test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}