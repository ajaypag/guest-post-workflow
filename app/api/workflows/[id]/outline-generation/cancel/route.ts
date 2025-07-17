import { NextRequest, NextResponse } from 'next/server';
import { agenticOutlineServiceV2 } from '@/lib/services/agenticOutlineServiceV2';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const result = await agenticOutlineServiceV2.cancelOutlineGeneration(sessionId);
    
    return NextResponse.json({
      success: result.success,
      message: 'Outline generation cancelled'
    });

  } catch (error: any) {
    console.error('Error cancelling outline generation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel outline generation' },
      { status: 500 }
    );
  }
}