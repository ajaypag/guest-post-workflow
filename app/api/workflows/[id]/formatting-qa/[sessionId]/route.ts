import { NextRequest, NextResponse } from 'next/server';
import { agenticFormattingQAService } from '@/lib/services/agenticFormattingQAService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    console.log('Fetching formatting QA session:', sessionId);

    // Get the QA session with all checks
    const qaSession = await agenticFormattingQAService.getQASession(sessionId);

    if (!qaSession) {
      return NextResponse.json({ error: 'QA session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: qaSession
    });

  } catch (error: any) {
    console.error('Error fetching formatting QA session:', error);
    return NextResponse.json({
      error: 'Failed to fetch formatting QA session',
      details: error.message
    }, { status: 500 });
  }
}