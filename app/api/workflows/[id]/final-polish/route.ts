import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishService } from '@/lib/services/agenticFinalPolishService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { originalArticle, researchOutline } = await request.json();
    const { id: workflowId } = await params;

    if (!originalArticle?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Original article is required'
      }, { status: 400 });
    }

    if (!researchOutline?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Research outline is required for context'
      }, { status: 400 });
    }

    // Create polish session
    const sessionId = await agenticFinalPolishService.createPolishSession(
      workflowId,
      originalArticle,
      researchOutline
    );

    // Start the polish workflow asynchronously
    // Don't await this to allow immediate response
    agenticFinalPolishService.startPolishWorkflow(sessionId).catch(error => {
      console.error('Polish workflow error:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Final polish workflow started'
    });

  } catch (error) {
    console.error('Error starting final polish:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start final polish'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    const progress = await agenticFinalPolishService.getPolishProgress(sessionId);

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error getting polish progress:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get progress'
    }, { status: 500 });
  }
}