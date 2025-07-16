import { NextRequest, NextResponse } from 'next/server';
import { agenticFormattingQAService } from '@/lib/services/agenticFormattingQAService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    console.log('Starting formatting QA session for workflow:', workflowId);

    // Start the QA session
    const sessionId = await agenticFormattingQAService.startQASession(workflowId);

    // Start the QA checks in the background
    agenticFormattingQAService.performQAChecks(sessionId).catch(error => {
      console.error('Background QA checks failed:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Formatting QA session started successfully'
    });

  } catch (error: any) {
    console.error('Error starting formatting QA session:', error);
    return NextResponse.json({
      error: 'Failed to start formatting QA session',
      details: error.message
    }, { status: 500 });
  }
}