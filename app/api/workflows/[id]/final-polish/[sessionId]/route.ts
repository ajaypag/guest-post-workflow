import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishService } from '@/lib/services/agenticFinalPolishService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.log(`📊 Getting polish results for session: ${sessionId}`);

    const results = await agenticFinalPolishService.getPolishResults(sessionId);

    if (results.error) {
      return NextResponse.json(
        { error: results.error, details: results.details },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('🔴 Error getting polish session results:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get polish session results',
        details: error.message 
      },
      { status: 500 }
    );
  }
}