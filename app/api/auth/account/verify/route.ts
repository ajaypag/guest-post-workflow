import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'account') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        companyName: session.companyName,
        userType: session.userType,
        clientId: session.clientId
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}