import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishV2Service } from '@/lib/services/agenticFinalPolishV2Service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Cancel the session
    await agenticFinalPolishV2Service.cancelSession(sessionId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Session cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel polish V2 error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    );
  }
}