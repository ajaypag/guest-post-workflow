import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isInternal = session.userType === 'internal';
    
    // Base query conditions
    let whereConditions = [];
    if (!isInternal) {
      // External users only see their own orders
      whereConditions.push(eq(orders.accountId, session.userId));
    }

    // Get all orders for notification counting
    const allOrders = await db.query.orders.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(orders.updatedAt)],
      columns: {
        id: true,
        status: true,
        state: true,
        updatedAt: true,
        accountId: true
      }
    });

    // Count action-required orders
    let actionRequiredCount = 0;
    
    allOrders.forEach(order => {
      const needsAction = getOrderNeedsAction(order, isInternal);
      if (needsAction) {
        actionRequiredCount++;
      }
    });

    // Count recent updates (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUpdates = allOrders.filter(order => 
      new Date(order.updatedAt) > sevenDaysAgo
    ).length;

    // Get most urgent orders for display
    const urgentOrders = allOrders
      .filter(order => getOrderNeedsAction(order, isInternal))
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        shortId: order.id.slice(0, 8),
        status: order.status,
        state: order.state,
        message: getActionMessage(order, isInternal)
      }));

    return NextResponse.json({
      actionRequiredCount,
      recentUpdatesCount: recentUpdates,
      urgentOrders,
      totalOrders: allOrders.length
    });

  } catch (error) {
    console.error('Error fetching notification summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getOrderNeedsAction(order: any, isInternal: boolean): boolean {
  // Add defensive check for order existence
  if (!order || !order.status) return false;
  
  if (isInternal) {
    // Internal user action items
    if (order.status === 'pending_confirmation') return true;
    if (order.status === 'confirmed' && order.state === 'sites_ready') return true;
    return false;
  } else {
    // External user action items
    if (order.status === 'draft') return true;
    if (order.status === 'confirmed' && order.state && (
      order.state === 'sites_ready' || 
      order.state === 'client_reviewing'
    )) return true;
    if (order.status === 'confirmed' && order.state === 'payment_pending') return true;
    return false;
  }
}

function getActionMessage(order: any, isInternal: boolean): string {
  // Add defensive check for order existence
  if (!order || !order.status) return 'Needs attention';
  
  if (isInternal) {
    if (order.status === 'pending_confirmation') return 'Needs confirmation';
    if (order.status === 'confirmed' && order.state === 'sites_ready') return 'Ready to send to client';
    return 'Needs attention';
  } else {
    if (order.status === 'draft') return 'Finish setup';
    if (order.status === 'confirmed' && order.state && (
      order.state === 'sites_ready' || 
      order.state === 'client_reviewing'
    )) return 'Review sites';
    if (order.status === 'confirmed' && order.state === 'payment_pending') return 'Payment due';
    return 'Needs attention';
  }
}