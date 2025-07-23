import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkOrchestrationSessions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      article,
      targetDomain,
      clientName,
      clientUrl,
      anchorText,
      guestPostSite,
      targetKeyword
    } = body;

    const sessionId = uuidv4();
    // Use a proper UUID for workflow_id since it's defined as UUID type in the table
    const testWorkflowId = uuidv4();
    const now = new Date();

    console.log('[Patch Test] Attempting corrected insert with proper column mapping');
    console.log('[Patch Test] Session ID:', sessionId);
    console.log('[Patch Test] Workflow ID:', testWorkflowId);

    // Try the corrected insert
    const result = await db.insert(linkOrchestrationSessions).values({
      id: sessionId,
      workflowId: testWorkflowId,
      version: 1,
      status: 'initializing',
      originalArticle: article,
      targetDomain: targetDomain,
      clientName: clientName,
      clientUrl: clientUrl,
      anchorText: anchorText || null,
      guestPostSite: guestPostSite,
      targetKeyword: targetKeyword,
      currentPhase: 0,
      // Don't include startedAt, createdAt, updatedAt - let the database defaults handle them
      // The schema shows these have default values
    }).returning();

    console.log('[Patch Test] Insert successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Test insert successful with corrected column mapping',
      sessionId: sessionId,
      result: result
    });
  } catch (error: any) {
    console.error('[Patch Test] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      }
    }, { status: 500 });
  }
}