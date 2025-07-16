import { NextRequest, NextResponse } from 'next/server';
import { agenticFormattingQAService } from '@/lib/services/agenticFormattingQAService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Getting latest formatting QA session for workflow:', id);
    
    const latestSession = await agenticFormattingQAService.getLatestQASession(id);
    
    if (!latestSession) {
      return NextResponse.json({
        success: true,
        session: null,
        message: 'No QA session found for this workflow'
      });
    }
    
    console.log('Found latest QA session:', latestSession.id);
    
    return NextResponse.json({
      success: true,
      session: latestSession
    });
    
  } catch (error: any) {
    console.error('Error getting latest formatting QA session:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}