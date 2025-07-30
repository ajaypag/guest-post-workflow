import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Search for account by email
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error searching for account:', error);
    return NextResponse.json(
      { error: 'Failed to search for account' },
      { status: 500 }
    );
  }
}