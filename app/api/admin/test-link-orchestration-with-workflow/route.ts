import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkOrchestrationSessions, workflows } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test Link Orchestration] Starting test with real workflow');
    
    // First, get an existing workflow ID or create a test workflow
    let workflowId: string;
    
    // Try to get the most recent workflow
    const existingWorkflows = await db.select()
      .from(workflows)
      .orderBy(desc(workflows.updatedAt))
      .limit(1);
    
    if (existingWorkflows.length > 0) {
      workflowId = existingWorkflows[0].id;
      console.log('[Test Link Orchestration] Using existing workflow:', workflowId);
    } else {
      // No workflows exist, return error
      return NextResponse.json({
        success: false,
        error: 'No workflows found in database. Please create a workflow first.',
        hint: 'Go to /workflow/new to create a workflow'
      }, { status: 400 });
    }
    
    const sessionId = uuidv4();
    
    // Test data
    const testData = {
      id: sessionId,
      workflowId: workflowId,
      version: 1,
      status: 'initializing',
      originalArticle: 'Test article content for link orchestration',
      targetDomain: 'example.com',
      clientName: 'Test Client',
      clientUrl: 'https://testclient.com',
      anchorText: 'test anchor',
      guestPostSite: 'testblog.com',
      targetKeyword: 'test keyword',
      currentPhase: 0
    };
    
    console.log('[Test Link Orchestration] Inserting with data:', testData);
    
    const result = await db.insert(linkOrchestrationSessions)
      .values(testData)
      .returning();
    
    console.log('[Test Link Orchestration] Insert successful!', result[0].id);
    
    return NextResponse.json({
      success: true,
      message: 'Link orchestration test successful! The feature is now working.',
      sessionId: result[0].id,
      workflowId: workflowId,
      record: result[0]
    });
    
  } catch (error: any) {
    console.error('[Test Link Orchestration] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        constraint: error.constraint
      }
    }, { status: 500 });
  }
}