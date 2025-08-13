import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'account') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Fetch account details to get emailVerified status
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.userId),
      columns: {
        emailVerified: true,
        status: true
      }
    });
    
    return NextResponse.json({
      valid: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        companyName: session.companyName,
        userType: session.userType,
        clientId: session.clientId,
        emailVerified: account?.emailVerified || false
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