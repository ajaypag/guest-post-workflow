import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Use the standard getSession method which handles all token types
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get fresh publisher data from database
    const publisher = await db.query.publishers.findFirst({
      where: eq(publishers.id, session.publisherId)
    });
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Publisher not found' },
        { status: 404 }
      );
    }
    
    if (publisher.status !== 'active') {
      return NextResponse.json(
        { error: 'Publisher account is not active' },
        { status: 403 }
      );
    }
    
    // Return user data
    return NextResponse.json({
      user: {
        id: publisher.id,
        email: publisher.email,
        name: publisher.contactName || publisher.companyName || 'Publisher User',
        companyName: publisher.companyName,
        userType: 'publisher',
        status: publisher.status,
        emailVerified: publisher.emailVerified
      }
    });
    
  } catch (error) {
    console.error('Publisher auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}