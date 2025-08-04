import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { AuthServiceServer } from '@/lib/auth-server';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal users can see assignable users
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all internal users who can be assigned
    const internalUsersList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.name));

    // Format response
    const formattedUsers = internalUsersList.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: `${user.name} (${user.email})`,
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error: any) {
    console.error('Error fetching assignable users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}