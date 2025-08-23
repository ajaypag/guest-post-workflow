import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, count, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const domainIds = searchParams.get('domainIds')?.split(',') || [];

    // If domainIds are provided, get their client IDs to filter orders
    let allowedClientIds: string[] = [];
    
    if (domainIds.length > 0) {
      const domains = await db
        .select({
          clientId: bulkAnalysisDomains.clientId,
        })
        .from(bulkAnalysisDomains)
        .where(inArray(bulkAnalysisDomains.id, domainIds));
      
      allowedClientIds = [...new Set(domains.map(d => d.clientId).filter(Boolean))];
    } else if (clientId) {
      allowedClientIds = [clientId];
    }

    // Build order query conditions
    let whereConditions = [
      // Only draft and pending orders can accept new domains
      inArray(orders.status, ['draft', 'pending'])
    ];

    // Add client filtering
    if (allowedClientIds.length > 0) {
      // Find orders that have line items from these clients
      const ordersWithMatchingClients = await db
        .selectDistinct({
          orderId: orderLineItems.orderId
        })
        .from(orderLineItems)
        .where(inArray(orderLineItems.clientId, allowedClientIds));
      
      const orderIds = ordersWithMatchingClients.map(o => o.orderId);
      
      if (orderIds.length > 0) {
        whereConditions.push(inArray(orders.id, orderIds));
      } else {
        // No matching orders, return empty result
        return NextResponse.json({ orders: [] });
      }
    }

    // Add user permission filtering
    if (session.userType === 'account') {
      // Account users can only see their own orders
      const accountId = session.accountId || session.userId;
      whereConditions.push(eq(orders.accountId, accountId));
    }
    // Internal users can see all orders (no additional filtering needed)

    // Fetch available orders with item counts
    const availableOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        state: orders.state,
        orderType: orders.orderType,
        totalRetail: orders.totalRetail,
        discountPercent: orders.discountPercent,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.updatedAt));

    // Get line item counts for each order
    const orderIds = availableOrders.map(o => o.id);
    const itemCounts = orderIds.length > 0 ? await db
      .select({
        orderId: orderLineItems.orderId,
        itemCount: count(orderLineItems.id),
      })
      .from(orderLineItems)
      .where(inArray(orderLineItems.orderId, orderIds))
      .groupBy(orderLineItems.orderId) : [];

    // Create lookup map for item counts
    const itemCountMap = new Map(
      itemCounts.map(ic => [ic.orderId, ic.itemCount])
    );

    // Combine orders with item counts
    const ordersWithCounts = availableOrders.map(order => ({
      ...order,
      itemCount: itemCountMap.get(order.id) || 0,
      displayName: `Order ${order.id.slice(-8)} (${itemCountMap.get(order.id) || 0} items)`,
      formattedTotal: `$${(order.totalRetail / 100).toFixed(2)}`,
      createdAtFormatted: new Date(order.createdAt).toLocaleDateString(),
    }));

    return NextResponse.json({
      orders: ordersWithCounts,
      total: ordersWithCounts.length,
    });

  } catch (error: any) {
    console.error('Error fetching available orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available orders', details: error.message },
      { status: 500 }
    );
  }
}