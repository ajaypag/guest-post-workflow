import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only internal users can transfer orders
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can transfer orders' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const { targetAccountId } = await request.json();

    if (!targetAccountId) {
      return NextResponse.json({ error: 'Target account ID is required' }, { status: 400 });
    }

    // Verify the order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify the target account exists
    const [targetAccount] = await db.select().from(accounts).where(eq(accounts.id, targetAccountId));
    if (!targetAccount) {
      return NextResponse.json({ error: 'Target account not found' }, { status: 404 });
    }

    // Get the current account for logging (if it exists)
    let currentAccount = null;
    if (order.accountId) {
      [currentAccount] = await db.select().from(accounts).where(eq(accounts.id, order.accountId));
    }

    // Transfer the order
    const [updatedOrder] = await db.update(orders)
      .set({
        accountId: targetAccountId,
        updatedAt: new Date(),
        internalNotes: `${order.internalNotes || ''}\n\n[${new Date().toISOString()}] Order transferred from ${currentAccount?.companyName || 'Unknown'} (${order.accountId}) to ${targetAccount.companyName} (${targetAccountId}) by ${session.email}`
      })
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      message: `Order successfully transferred to ${targetAccount.companyName}`
    });

  } catch (error: any) {
    console.error('Error transferring order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transfer order' },
      { status: 500 }
    );
  }
}