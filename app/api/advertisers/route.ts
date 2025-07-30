import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthServiceServer } from '@/lib/auth-server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { email, contactName, companyName, clientId } = data;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if advertiser user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      // Update existing advertiser user
      const [updated] = await db
        .update(users)
        .set({
          name: contactName || existing.name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      return NextResponse.json({ advertiser: updated });
    }

    // Create new advertiser user
    // Generate a random password for the advertiser
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [advertiser] = await db
      .insert(users)
      .values({
        id: uuidv4(),
        email: email.toLowerCase(),
        name: contactName,
        passwordHash: hashedPassword,
        role: 'client',
        userType: 'advertiser',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ advertiser });
  } catch (error) {
    console.error('Error creating advertiser:', error);
    return NextResponse.json(
      { error: 'Failed to create advertiser' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allAdvertisers = await db.query.users.findMany({
      where: eq(users.role, 'client'),
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    return NextResponse.json({ advertisers: allAdvertisers });
  } catch (error) {
    console.error('Error fetching advertisers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advertisers' },
      { status: 500 }
    );
  }
}