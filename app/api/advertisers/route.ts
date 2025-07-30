import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, count, sum } from 'drizzle-orm';
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

    if (!email || !contactName) {
      return NextResponse.json({ error: 'Email and contact name are required' }, { status: 400 });
    }

    // Check if advertiser already exists
    const existing = await db.query.advertisers.findFirst({
      where: eq(advertisers.email, email.toLowerCase()),
    });

    if (existing) {
      // Update existing advertiser
      const [updated] = await db
        .update(advertisers)
        .set({
          contactName: contactName || existing.contactName,
          companyName: companyName || existing.companyName,
          updatedAt: new Date(),
        })
        .where(eq(advertisers.id, existing.id))
        .returning();

      return NextResponse.json({ advertiser: updated });
    }

    // Create new advertiser
    // Generate a random password for the advertiser
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [advertiser] = await db
      .insert(advertisers)
      .values({
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        contactName,
        companyName: companyName || '',
        primaryClientId: clientId || null,
        status: 'pending',
        emailVerified: false,
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

    // Fetch all advertisers with their primary client data
    const advertisersList = await db.query.advertisers.findMany({
      with: {
        primaryClient: true,
      },
      orderBy: (advertisers, { desc }) => [desc(advertisers.createdAt)],
    });

    // Fetch order statistics for each advertiser
    const advertisersWithStats = await Promise.all(
      advertisersList.map(async (advertiser) => {
        // Get order count and total revenue
        const orderStats = await db
          .select({
            orderCount: count(orders.id),
            totalRevenue: sum(orders.totalRetail),
          })
          .from(orders)
          .where(eq(orders.advertiserId, advertiser.id))
          .groupBy(orders.advertiserId);

        return {
          ...advertiser,
          orderCount: orderStats[0]?.orderCount || 0,
          totalRevenue: orderStats[0]?.totalRevenue || 0,
        };
      })
    );

    return NextResponse.json({ advertisers: advertisersWithStats });
  } catch (error) {
    console.error('Error fetching advertisers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advertisers' },
      { status: 500 }
    );
  }
}