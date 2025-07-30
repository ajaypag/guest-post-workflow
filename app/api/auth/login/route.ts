import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/db/userService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await UserService.verifyPassword(email, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await AuthServiceServer.createSession(user);
    
    // Create response first
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        userType: user.userType || 'internal'
      }
    });

    // Set cookie on the response
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log environment for debugging
    console.log('🔐 Setting cookie with:', {
      name: 'auth-token',
      value: token.substring(0, 20) + '...',
      httpOnly: true,
      secure: isProduction,
      nodeEnv: process.env.NODE_ENV,
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      // Add domain if specified in env
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
    });

    console.log('🔐 Login successful, cookie set for:', user.email);
    console.log('🔐 Response headers:', response.headers.get('set-cookie'));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}