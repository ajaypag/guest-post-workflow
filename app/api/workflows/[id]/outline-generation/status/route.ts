import { NextRequest, NextResponse } from 'next/server';
import { agenticOutlineService } from '@/lib/services/agenticOutlineServiceUnified';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const clientSequenceNumber = searchParams.get('sequenceNumber') ? 
    parseInt(searchParams.get('sequenceNumber')!) : undefined;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    const result = await agenticOutlineService.checkOutlineStatus(sessionId, clientSequenceNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking outline status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check outline status' },
      { status: 500 }
    );
  }
}