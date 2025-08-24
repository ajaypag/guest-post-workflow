import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionManager } from '@/lib/services/sessionManager';

export async function POST(request: NextRequest) {
  try {
    // Get session ID from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');
    
    if (sessionCookie?.value) {
      // Delete session from database
      await SessionManager.deleteSession(sessionCookie.value);
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    // Clear the auth-session cookie
    response.cookies.set({
      name: 'auth-session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire immediately
    });
    
    return response;
    
  } catch (error) {
    console.error('Publisher logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}