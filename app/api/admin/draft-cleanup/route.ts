import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, all internal users can access this admin tool
    // You can add more specific permission checks here if needed

    // Fetch all draft orders with calculated days since update
    const draftOrders = await db
      .select({
        id: orders.id,
        accountEmail: orders.accountEmail,
        accountName: orders.accountName,
        totalRetail: orders.totalRetail,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        daysSinceUpdate: sql<number>`EXTRACT(DAY FROM NOW() - ${orders.updatedAt})::INTEGER`.as('daysSinceUpdate')
      })
      .from(orders)
      .where(eq(orders.status, 'draft'))
      .orderBy(sql`${orders.updatedAt} ASC`); // Oldest first

    return NextResponse.json({ 
      drafts: draftOrders,
      totalCount: draftOrders.length 
    });
  } catch (error) {
    console.error('Error fetching draft orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draft orders' },
      { status: 500 }
    );
  }
}