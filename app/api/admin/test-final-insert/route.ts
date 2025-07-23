import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkOrchestrationSessions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const sessionId = uuidv4();
    const workflowId = uuidv4();
    
    console.log('[Final Test] Testing insert with all columns present');
    
    const result = await db.insert(linkOrchestrationSessions).values({
      id: sessionId,
      workflowId: workflowId,
      version: 1,
      status: 'initializing',
      originalArticle: 'Test article content for final test',
      targetDomain: 'example.com',
      clientName: 'Test Client',
      clientUrl: 'https://testclient.com',
      anchorText: 'test anchor',
      guestPostSite: 'testblog.com',
      targetKeyword: 'test keyword',
      currentPhase: 0
    }).returning();
    
    console.log('[Final Test] Insert successful!', result[0].id);
    
    return NextResponse.json({
      success: true,
      message: 'Insert successful! Link orchestration is now working.',
      sessionId: result[0].id,
      record: result[0]
    });
    
  } catch (error: any) {
    console.error('[Final Test] Insert failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint
      }
    }, { status: 500 });
  }
}