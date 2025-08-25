import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/schema';
import { stripeCheckoutSessions } from '@/lib/db/paymentSchema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get the test order
    const testOrderId = '0380b223-ef91-46f4-a074-8563dada1b88';
    
    const orderData = await db
      .select({
        orderId: orders.id,
        accountId: orders.accountId,
        totalRetail: orders.totalRetail,
        state: orders.state,
        paidAt: orders.paidAt,
        contactName: accounts.contactName,
        email: accounts.email,
        companyName: accounts.companyName,
      })
      .from(orders)
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
      .where(eq(orders.id, testOrderId))
      .limit(1);

    // Get checkout sessions for this order
    const sessions = await db
      .select()
      .from(stripeCheckoutSessions)
      .where(eq(stripeCheckoutSessions.orderId, testOrderId));

    return NextResponse.json({
      order: orderData[0] || null,
      checkoutSessions: sessions,
      accountId: orderData[0]?.accountId,
      instructions: {
        loginAs: 'account',
        accountId: orderData[0]?.accountId,
        email: orderData[0]?.email,
        billingUrl: '/billing',
        note: 'You need to be logged in as this account to see billing history'
      }
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}