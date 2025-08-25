import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check the Abelino account
    const accountId = 'fc870f66-f4a3-4034-a154-414acf0c0121';
    
    const accountData = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    // Get all orders for this account
    const accountOrders = await db
      .select({
        id: orders.id,
        orderType: orders.orderType,
        state: orders.state,
        totalRetail: orders.totalRetail,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(eq(orders.accountId, accountId))
      .orderBy(orders.createdAt);

    return NextResponse.json({
      account: accountData[0] || null,
      totalOrders: accountOrders.length,
      orders: accountOrders,
      note: "This account data was already in your database - not created by me"
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}