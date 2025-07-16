import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections, workflows } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    let { workflowId } = await request.json();
    
    if (!workflowId) {
      // Get the first workflow from the database
      const firstWorkflow = await db.select().from(workflows).limit(1);
      if (!firstWorkflow.length) {
        return NextResponse.json({
          success: false,
          error: 'No workflows found in database. Create a workflow first.'
        });
      }
      workflowId = firstWorkflow[0].id;
    }
    
    console.log('Testing polish insert with real workflow ID:', workflowId);
    
    // Verify workflow exists
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (!workflow.length) {
      return NextResponse.json({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    // Create test session
    const sessionId = uuidv4();
    const now = new Date();
    
    let sessionResult = null;
    let sessionError = null;
    
    try {
      console.log('Creating test polish session...');
      await db.insert(polishSessions).values({
        id: sessionId,
        workflowId: workflowId,
        version: 999, // High number to avoid conflicts
        stepId: 'final-polish',
        status: 'test',
        originalArticle: 'Test article for debugging database issues',
        researchContext: 'Test context',
        polishMetadata: { 
          test: true,
          timestamp: now.toISOString()
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });
      sessionResult = 'Success';
    } catch (error: any) {
      sessionError = {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        hint: error.hint
      };
      console.error('Session insert error:', error);
    }
    
    // Create test section if session was created
    let sectionResult = null;
    let sectionError = null;
    
    if (sessionResult) {
      try {
        console.log('Creating test polish section...');
        const sectionId = uuidv4();
        
        await db.insert(polishSections).values({
          id: sectionId,
          polishSessionId: sessionId,
          workflowId: workflowId,
          version: 999,
          sectionNumber: 1,
          title: 'Test Section Title',
          originalContent: 'This is the original content that needs polishing.',
          polishedContent: 'This is the polished content with improvements.',
          strengths: 'Good structure and flow',
          weaknesses: 'Could use more engagement',
          brandConflicts: 'Semantic guide wants brevity, brand guide wants detail',
          polishApproach: 'balanced',
          engagementScore: 8,
          clarityScore: 9,
          status: 'completed',
          polishMetadata: {
            test: true,
            timestamp: now.toISOString()
          },
          createdAt: now,
          updatedAt: now
        });
        sectionResult = 'Success';
      } catch (error: any) {
        sectionError = {
          message: error.message,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          hint: error.hint,
          table: error.table
        };
        console.error('Section insert error:', error);
      }
    }
    
    // Query back the data to verify
    let queryResults = null;
    if (sessionResult && sectionResult) {
      const sessions = await db.select().from(polishSessions).where(eq(polishSessions.id, sessionId));
      const sections = await db.select().from(polishSections).where(eq(polishSections.polishSessionId, sessionId));
      queryResults = {
        sessionsFound: sessions.length,
        sectionsFound: sections.length
      };
      
      // Clean up test data
      try {
        await db.delete(polishSections).where(eq(polishSections.polishSessionId, sessionId));
        await db.delete(polishSessions).where(eq(polishSessions.id, sessionId));
        console.log('Test data cleaned up');
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    return NextResponse.json({
      success: !!(sessionResult && sectionResult),
      workflowId: workflowId,
      session: {
        result: sessionResult,
        error: sessionError
      },
      section: {
        result: sectionResult,
        error: sectionError
      },
      queryResults
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}