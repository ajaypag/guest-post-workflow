import { NextRequest, NextResponse } from 'next/server';
import { agenticFinalPolishV2Service } from '@/lib/services/agenticFinalPolishV2Service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    console.log(`📝 Starting V2 polish session for workflow ${workflowId}`);
    
    // Start the session
    const sessionId = await agenticFinalPolishV2Service.startSession(workflowId);
    
    // Start the polish process in the background
    agenticFinalPolishV2Service.performPolish(sessionId).catch(error => {
      console.error('Background polish process failed:', error);
    });
    
    return NextResponse.json({ 
      sessionId,
      message: 'V2 polish session started successfully' 
    });
  } catch (error: any) {
    console.error('Failed to start V2 polish session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start polish session' },
      { status: 500 }
    );
  }
}