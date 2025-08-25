import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { targetPages } from '@/lib/db/schema';
import { clients } from '@/lib/db/schema';
import { eq, and, like, sql, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First fetch the project to get its tags
    const project = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.id, params.projectId))
      .limit(1);
    
    if (!project[0]) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Extract order IDs from project tags (tags like "order:orderId")
    const tags = (project[0].tags as string[]) || [];
    const orderTags = tags.filter((tag: string) => tag.startsWith('order:'));
    const orderIds = orderTags.map((tag: string) => tag.replace('order:', ''));
    
    if (orderIds.length === 0) {
      return NextResponse.json({ orders: [], count: 0 });
    }
    
    // Fetch orders with their line items and target pages
    const ordersData = await db
      .select({
        orderId: orders.id,
        orderState: orders.state,
        orderStatus: orders.status,
        orderTotalRetail: orders.totalRetail,
        orderCreatedAt: orders.createdAt,
        lineItemId: orderLineItems.id,
        clientId: orderLineItems.clientId,
        targetPageId: orderLineItems.targetPageId,
        targetPageUrl: targetPages.url,
        clientName: clients.name
      })
      .from(orders)
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .leftJoin(targetPages, eq(orderLineItems.targetPageId, targetPages.id))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .where(inArray(orders.id, orderIds));
    
    // Group data by order and collect unique target pages
    const orderMap = new Map();
    
    ordersData.forEach(row => {
      if (!orderMap.has(row.orderId)) {
        orderMap.set(row.orderId, {
          orderId: row.orderId,
          orderName: `Order #${row.orderId.substring(0, 8)}`,
          clientName: row.clientName,
          createdAt: row.orderCreatedAt,
          state: row.orderState,
          status: row.orderStatus,
          totalPrice: row.orderTotalRetail,
          linkCount: 0,
          targetPages: new Set(),
          clientId: row.clientId
        });
      }
      
      const order = orderMap.get(row.orderId);
      if (row.lineItemId) {
        order.linkCount++;
      }
      if (row.targetPageUrl) {
        order.targetPages.add(row.targetPageUrl);
      }
    });
    
    // Convert to array and format
    const formattedOrders = Array.from(orderMap.values()).map(order => ({
      orderId: order.orderId,
      orderName: order.orderName,
      orderGroupId: order.orderId, // For backward compatibility
      orderGroupName: `${order.clientName || 'Unknown Client'} - ${order.linkCount} links`,
      createdAt: order.createdAt,
      state: order.state,
      status: order.status,
      totalPrice: order.totalPrice,
      linkCount: order.linkCount,
      targetPages: Array.from(order.targetPages),
      clientId: order.clientId
    }));
    
    return NextResponse.json({ 
      orders: formattedOrders,
      count: formattedOrders.length
    });
    
  } catch (error) {
    console.error('Error fetching associated orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}