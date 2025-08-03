import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId, groupId } = await params;

    // First verify the order exists and user has access
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      // Accounts can only see their own orders
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and accounts can view orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the specific order group
    const orderGroup = await db.query.orderGroups.findFirst({
      where: and(
        eq(orderGroups.id, groupId),
        eq(orderGroups.orderId, orderId)
      ),
      with: {
        client: true
      }
    });
    
    if (!orderGroup) {
      return NextResponse.json({ error: 'Order group not found' }, { status: 404 });
    }

    return NextResponse.json({
      order,
      orderGroup
    });
  } catch (error) {
    console.error('Error fetching order group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order group' },
      { status: 500 }
    );
  }
}