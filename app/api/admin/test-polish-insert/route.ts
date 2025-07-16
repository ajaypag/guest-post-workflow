import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    console.log('Testing polish table inserts...');
    
    // First, try to create a test session
    const sessionId = uuidv4();
    const workflowId = uuidv4(); // Fake workflow ID for testing
    const now = new Date();
    
    let sessionInsertResult = null;
    let sessionInsertError = null;
    
    try {
      console.log('Attempting to insert test polish session...');
      await db.insert(polishSessions).values({
        id: sessionId,
        workflowId: workflowId,
        version: 1,
        stepId: 'final-polish',
        status: 'test',
        originalArticle: 'Test article content',
        researchContext: 'Test research context',
        polishMetadata: { test: true },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });
      sessionInsertResult = 'Session insert successful';
      console.log('Session insert successful');
    } catch (error: any) {
      sessionInsertError = {
        message: error.message,
        code: error.code,
        detail: error.detail,
        table: error.table,
        constraint: error.constraint
      };
      console.error('Session insert failed:', error);
    }
    
    // Then try to create a test section
    let sectionInsertResult = null;
    let sectionInsertError = null;
    
    if (sessionInsertResult) {
      try {
        console.log('Attempting to insert test polish section...');
        const sectionId = uuidv4();
        
        await db.insert(polishSections).values({
          id: sectionId,
          polishSessionId: sessionId,
          workflowId: workflowId,
          version: 1,
          sectionNumber: 1,
          title: 'Test Section',
          originalContent: 'Original test content',
          polishedContent: 'Polished test content',
          strengths: 'Test strengths',
          weaknesses: 'Test weaknesses',
          brandConflicts: 'Test conflicts',
          polishApproach: 'test-approach',
          engagementScore: 8,
          clarityScore: 9,
          status: 'test',
          polishMetadata: { test: true },
          createdAt: now,
          updatedAt: now
        });
        sectionInsertResult = 'Section insert successful';
        console.log('Section insert successful');
      } catch (error: any) {
        sectionInsertError = {
          message: error.message,
          code: error.code,
          detail: error.detail,
          table: error.table,
          constraint: error.constraint,
          stack: error.stack
        };
        console.error('Section insert failed:', error);
      }
    }
    
    // Clean up test data if successful
    if (sessionInsertResult && sectionInsertResult) {
      try {
        // Delete in reverse order due to foreign keys
        await db.delete(polishSections).where(eq(polishSections.polishSessionId, sessionId));
        await db.delete(polishSessions).where(eq(polishSessions.id, sessionId));
        console.log('Test data cleaned up successfully');
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
    
    return NextResponse.json({
      success: sessionInsertResult && sectionInsertResult,
      results: {
        session: {
          result: sessionInsertResult,
          error: sessionInsertError
        },
        section: {
          result: sectionInsertResult,
          error: sectionInsertError
        }
      }
    });
    
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

// Add missing import
import { eq } from 'drizzle-orm';