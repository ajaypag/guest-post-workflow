import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { accounts } from '@/lib/db/accountSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { clients } from '@/lib/db/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';

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

    // Get all orders with their line items, clients, accounts, and line item counts
    const allOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        state: orders.state,
        updatedAt: orders.updatedAt,
        accountId: orders.accountId,
        totalRetail: orders.totalRetail,
        orderGroups: orderGroups,
        // Client details (this is what we want to show - the actual brands)
        clientName: clients.name,
        clientWebsite: clients.website,
        // Account details (the company that placed the order)
        accountName: accounts.companyName,
        accountEmail: accounts.email,
        // Line item count (we'll aggregate this manually)
        lineItemCount: sql<number>`
          (SELECT COUNT(*) 
           FROM ${orderLineItems} 
           WHERE ${orderLineItems.orderId} = ${orders.id})`.as('lineItemCount')
      })
      .from(orders)
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .leftJoin(orderGroups, eq(orders.id, orderGroups.orderId))
      .leftJoin(accounts, eq(orders.accountId, accounts.id))
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
          totalRetail: row.totalRetail,
          accountName: row.accountName,
          accountEmail: row.accountEmail,
          lineItemCount: row.lineItemCount,
          orderGroups: [],
          clientNames: new Set<string>() // Track unique client names
        });
      }
      if (row.orderGroups) {
        orderMap.get(row.id).orderGroups.push(row.orderGroups);
      }
      // Add client name if it exists
      if (row.clientName) {
        orderMap.get(row.id).clientNames.add(row.clientName);
      }
    });

    // Convert clientNames Set to a display string and finalize orders
    const uniqueOrders = Array.from(orderMap.values()).map(order => ({
      ...order,
      // Create a display name: if multiple clients, show "ClientA, ClientB" or "ClientA + 2 more"
      displayName: (() => {
        const names = Array.from(order.clientNames);
        if (names.length === 0) return order.accountName || 'Unknown Client';
        if (names.length === 1) return names[0];
        if (names.length === 2) return names.join(', ');
        return `${names[0]} + ${names.length - 1} more`;
      })(),
      clientNames: undefined // Remove the Set from final object
    }));

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

    // Get most urgent orders for display with rich details
    const urgentOrders = uniqueOrders
      .filter(order => getOrderNeedsAction(order, isInternal))
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        shortId: order.id.slice(0, 8),
        status: order.status,
        state: order.state,
        message: getActionMessage(order, isInternal),
        // Rich details - use displayName (client names) instead of accountName
        accountName: order.displayName || 'Unknown Client',
        accountEmail: order.accountEmail,
        lineItemCount: order.lineItemCount || 0,
        totalRetail: order.totalRetail || 0,
        updatedAt: order.updatedAt,
        // Group details for more suggestions
        groupsNeedingSuggestions: isInternal && order.orderGroups ? 
          order.orderGroups.filter((group: any) => {
            const metadata = (group.requirementOverrides as any) || {};
            return metadata.needsMoreSuggestions === true;
          }).length : 0
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