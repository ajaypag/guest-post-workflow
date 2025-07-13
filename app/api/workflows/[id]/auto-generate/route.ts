import { NextRequest, NextResponse } from 'next/server';
import { agenticArticleService } from '@/lib/services/agenticArticleService';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { outline } = await request.json();

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline is required from Deep Research step' },
        { status: 400 }
      );
    }

    console.log('🤖 Starting agentic article generation for workflow:', workflowId);

    // Start the agentic session
    const sessionId = await agenticArticleService.startAgenticSession(workflowId, outline);

    // Start article generation in background (non-blocking)
    agenticArticleService.generateArticle(sessionId, outline).catch(error => {
      console.error('Background article generation failed:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Article generation started. Use /progress endpoint to track status.'
    });

  } catch (error: any) {
    console.error('🔴 Error starting agentic article generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start article generation',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get progress data
    const progress = await agenticArticleService.getSessionProgress(sessionId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...progress
    });

  } catch (error: any) {
    console.error('🔴 Error getting agentic progress:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get progress',
        details: error.message 
      },
      { status: 500 }
    );
  }
}