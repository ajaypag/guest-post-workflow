import { NextRequest, NextResponse } from 'next/server';
import { agenticOutlineService } from '@/lib/services/agenticOutlineService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    console.log(`📋 Getting latest outline session for workflow ${workflowId}`);

    const session = await agenticOutlineService.getLatestSession(workflowId);

    if (!session) {
      return NextResponse.json({
        success: true,
        session: null,
        message: 'No outline generation sessions found'
      });
    }

    console.log(`✅ Found outline session:`, {
      id: session.id,
      status: session.status,
      version: session.version
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        version: session.version,
        needsClarification: session.status === 'clarifying',
        questions: session.clarificationQuestions,
        outline: session.finalOutline,
        citations: session.citations,
        createdAt: session.createdAt,
        completedAt: session.completedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting latest outline session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get latest session' },
      { status: 500 }
    );
  }
}