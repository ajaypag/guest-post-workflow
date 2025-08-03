import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: (users, { asc }) => [asc(users.email)]
    });

    return NextResponse.json({
      users: allUsers.map(user => ({
        ...user,
        userType: 'internal', // All users in the users table are internal
        createdAt: user.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or user' }, { status: 400 });
    }

    // Update the user's role
    await db
      .update(users)
      .set({ 
        role: role as 'admin' | 'user',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log the change for audit trail
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true, name: true }
    });

    console.log(`ROLE CHANGE: Admin ${session.email} changed ${targetUser?.email || userId} role to ${role}`);

    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}