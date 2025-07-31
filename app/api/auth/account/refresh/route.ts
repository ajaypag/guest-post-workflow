import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('auth-token-account')?.value;
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = cookieToken || headerToken;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token but ignore expiration
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        clockTolerance: Infinity // Ignore expiration
      });
      
      // Check if token is actually expired
      const now = Date.now() / 1000;
      const exp = payload.exp as number;
      
      // If token is not expired or expired more than 7 days ago, reject
      if (exp > now) {
        return NextResponse.json(
          { error: 'Token is still valid' },
          { status: 400 }
        );
      }
      
      if (exp < now - (7 * 24 * 60 * 60)) {
        return NextResponse.json(
          { error: 'Token expired too long ago. Please login again.' },
          { status: 401 }
        );
      }
      
      // Create new session data
      const sessionData = {
        userId: payload.userId as string,
        accountId: payload.accountId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as any,
        userType: payload.userType as any,
        clientId: payload.clientId as string | null | undefined,
        companyName: payload.companyName as string | undefined
      };
      
      // Create new token
      const newToken = await AuthServiceServer.createAccountToken(sessionData);
      
      // Set response without exposing token
      const response = NextResponse.json({
        success: true,
        user: {
          id: sessionData.userId,
          email: sessionData.email,
          name: sessionData.name,
          companyName: sessionData.companyName,
          userType: sessionData.userType,
          clientId: sessionData.clientId
        }
      });
      
      // Set new cookie
      response.cookies.set({
        name: 'auth-token-account',
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      return response;
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}