import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session from server
    const session = await AuthServiceServer.getSession(request);
    
    // Also check cookies directly
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    const authTokenAccount = cookieStore.get('auth-token-account');
    
    return NextResponse.json({
      hasSession: !!session,
      session,
      cookies: {
        'auth-token': !!authToken,
        'auth-token-account': !!authTokenAccount,
        allCookies: cookieStore.getAll().map(c => c.name)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}