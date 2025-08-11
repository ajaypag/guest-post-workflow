import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
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

    // Get all orders with their groups to check for more suggestions needed
    const allOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        state: orders.state,
        updatedAt: orders.updatedAt,
        accountId: orders.accountId,
        orderGroups: orderGroups
      })
      .from(orders)
      .leftJoin(orderGroups, eq(orders.id, orderGroups.orderId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(orders.updatedAt));

    // Group orders by ID to handle multiple order groups per order
    const orderMap = new Map();
    allOrders.forEach(row => {
      if (!orderMap.has(row.id)) {
        orderMap.set(row.id, {
          id: row.id,
          status: row.status,
          state: row.state,
          updatedAt: row.updatedAt,
          accountId: row.accountId,
          orderGroups: []
        });
      }
      if (row.orderGroups) {
        orderMap.get(row.id).orderGroups.push(row.orderGroups);
      }
    });

    const uniqueOrders = Array.from(orderMap.values());

    // Count action-required orders and categorize them
    let actionRequiredCount = 0;
    let moreSuggestionsCount = 0;
    
    uniqueOrders.forEach(order => {
      const needsAction = getOrderNeedsAction(order, isInternal);
      if (needsAction) {
        actionRequiredCount++;
        
        // Check if this order needs more suggestions specifically
        const hasMoreSuggestionsNeeded = isInternal && order.orderGroups && 
          order.orderGroups.some((group: any) => {
            const metadata = (group.requirementOverrides as any) || {};
            return metadata.needsMoreSuggestions === true;
          });
        
        if (hasMoreSuggestionsNeeded) {
          moreSuggestionsCount++;
        }
      }
    });

    // Count recent updates (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUpdates = uniqueOrders.filter(order => 
      new Date(order.updatedAt) > sevenDaysAgo
    ).length;

    // Get most urgent orders for display
    const urgentOrders = uniqueOrders
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
      totalOrders: uniqueOrders.length,
      moreSuggestionsCount: moreSuggestionsCount // NEW: Count of orders needing more suggestions
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
  
  // Check if any order groups need more suggestions (for internal users)
  const hasMoreSuggestionsNeeded = isInternal && order.orderGroups && 
    order.orderGroups.some((group: any) => {
      const metadata = (group.requirementOverrides as any) || {};
      return metadata.needsMoreSuggestions === true;
    });
  
  if (isInternal) {
    // Internal user action items
    if (order.status === 'pending_confirmation') return true;
    if (order.status === 'confirmed' && order.state === 'sites_ready') return true;
    if (hasMoreSuggestionsNeeded) return true; // NEW: Check for more suggestions needed
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
  
  // Check if any order groups need more suggestions (for internal users)
  const hasMoreSuggestionsNeeded = isInternal && order.orderGroups && 
    order.orderGroups.some((group: any) => {
      const metadata = (group.requirementOverrides as any) || {};
      return metadata.needsMoreSuggestions === true;
    });

  // Get count of groups needing more suggestions
  const moreSuggestionsCount = isInternal && order.orderGroups ? 
    order.orderGroups.filter((group: any) => {
      const metadata = (group.requirementOverrides as any) || {};
      return metadata.needsMoreSuggestions === true;
    }).length : 0;
  
  if (isInternal) {
    if (hasMoreSuggestionsNeeded) {
      return moreSuggestionsCount > 1 
        ? `${moreSuggestionsCount} groups need more sites`
        : 'Client needs more site suggestions';
    }
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