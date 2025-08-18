import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch fresh publisher data
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, session.userId)
    });
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }
    
    // Check if publisher is still active
    if (publisher.status !== 'active') {
      return NextResponse.json(
        { error: 'Publisher account is not active' },
        { status: 403 }
      );
    }
    
    // Create refreshed session data
    const sessionData = {
      userId: publisher.id,
      publisherId: publisher.id,
      email: publisher.email,
      name: publisher.contactName || publisher.companyName || 'Publisher User',
      role: 'publisher' as any,
      userType: 'publisher' as const,
      companyName: publisher.companyName,
      status: publisher.status
    };
    
    // Create new JWT token
    const token = await AuthServiceServer.createPublisherToken(sessionData);
    
    // Set new cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: publisher.id,
        email: publisher.email,
        name: publisher.contactName || publisher.companyName,
        companyName: publisher.companyName,
        userType: 'publisher',
        status: publisher.status
      }
    });
    
    response.cookies.set({
      name: 'auth-token-publisher',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
    
  } catch (error) {
    console.error('Publisher token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}