import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Search for advertiser user by email
    const advertiser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return NextResponse.json({ advertiser });
  } catch (error) {
    console.error('Error searching for advertiser:', error);
    return NextResponse.json(
      { error: 'Failed to search for advertiser' },
      { status: 500 }
    );
  }
}