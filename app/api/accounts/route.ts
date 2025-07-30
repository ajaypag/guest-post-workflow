import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
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

    // Check if account already exists
    const existing = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (existing) {
      // Update existing account
      const [updated] = await db
        .update(accounts)
        .set({
          contactName: contactName || existing.contactName,
          companyName: companyName || existing.companyName,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existing.id))
        .returning();

      return NextResponse.json({ account: updated });
    }

    // Create new account
    // Generate a random password for the account
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [account] = await db
      .insert(accounts)
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

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if this is a simple request (no auth required for new order system)
    const { searchParams } = new URL(request.url);
    const simple = searchParams.get('simple') === 'true';
    
    if (simple) {
      // Simple mode for new order system - return users with role 'user'
      const { users } = await import('@/lib/db/schema');
      const { and } = await import('drizzle-orm');
      
      const accounts = await db.select({
        id: users.id,
        email: users.email,
        name: users.name
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'user'),
          eq(users.isActive, true)
        )
      )
      .orderBy(users.name);

      return NextResponse.json(accounts);
    }
    
    // Original implementation for legacy system
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all accounts with their primary client data
    const accountsList = await db.query.accounts.findMany({
      with: {
        primaryClient: true,
      },
      orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
    });

    // Fetch order statistics for each account
    const accountsWithStats = await Promise.all(
      accountsList.map(async (account) => {
        // Get order count and total revenue
        const orderStats = await db
          .select({
            orderCount: count(orders.id),
            totalRevenue: sum(orders.totalRetail),
          })
          .from(orders)
          .where(eq(orders.accountId, account.id))
          .groupBy(orders.accountId);

        return {
          ...account,
          orderCount: orderStats[0]?.orderCount || 0,
          totalRevenue: orderStats[0]?.totalRevenue || 0,
        };
      })
    );

    return NextResponse.json({ accounts: accountsWithStats });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}