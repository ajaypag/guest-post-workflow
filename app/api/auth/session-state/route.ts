import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const sessionState = await AuthServiceServer.getSessionState(request);
    
    return NextResponse.json({ 
      success: true, 
      sessionState 
    });
  } catch (error) {
    console.error('❌ Error fetching session state:', error);
    return NextResponse.json({ 
      success: false, 
      sessionState: null 
    });
  }
}