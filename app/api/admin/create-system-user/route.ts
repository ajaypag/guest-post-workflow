import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function POST() {
  try {
    // Check if system user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, SYSTEM_USER_ID)
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'System user already exists',
        user: existingUser
      });
    }

    // Create system user
    const hashedPassword = await bcrypt.hash('system-user-not-for-login', 10);
    
    const [systemUser] = await db.insert(users).values({
      id: SYSTEM_USER_ID,
      email: 'system@internal.postflow',
      name: 'System User',
      passwordHash: hashedPassword,
      role: 'user',
      isActive: false, // Prevent login
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return NextResponse.json({
      message: 'System user created successfully',
      user: systemUser
    });

  } catch (error: any) {
    console.error('Error creating system user:', error);
    return NextResponse.json({
      error: 'Failed to create system user',
      details: error.message
    }, { status: 500 });
  }
}