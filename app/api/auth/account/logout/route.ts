import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
    });
    
    // Clear auth cookie by setting it with maxAge 0
    response.cookies.set({
      name: 'auth-token-account',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire immediately
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}