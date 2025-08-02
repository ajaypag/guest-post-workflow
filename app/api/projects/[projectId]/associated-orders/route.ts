import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and, ne, or, notInArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

// Define Order type to match the frontend expectations
interface Order {
  id: string;
  accountName: string;
  accountEmail: string;
  createdAt: string;
  itemCount: number;
  totalRetail: number;
  status?: string;
}

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

    // Get all order groups that have this project assigned
    const groupsWithOrders = await db
      .select({
        order: orders,
        orderGroup: orderGroups
      })
      .from(orderGroups)
      .innerJoin(orders, eq(orderGroups.orderId, orders.id))
      .where(eq(orderGroups.bulkAnalysisProjectId, params.projectId));

    // Filter orders based on status - exclude completed and cancelled orders
    const activeOrders = groupsWithOrders.filter(({ order }) => {
      return order.status !== 'completed' && order.status !== 'cancelled';
    });

    // Transform the data for the frontend
    const associatedOrders = activeOrders.map(({ order, orderGroup }) => ({
      id: order.id,
      accountName: order.accountName,
      accountEmail: order.accountEmail,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      itemCount: orderGroup.linkCount, // Use itemCount for compatibility with OrderSelectionModal
      totalRetail: order.totalRetail
    }));

    // Also get draft orders for this client (backward compatibility)
    // First get the client ID from the first order group
    const clientId = groupsWithOrders[0]?.orderGroup.clientId;
    let draftOrders: Order[] = [];
    
    if (clientId) {
      // Get all draft orders for this client that aren't already associated
      const associatedOrderIds = groupsWithOrders.map(({ order }) => order.id);
      
      const whereConditions = [
        eq(orderGroups.clientId, clientId),
        eq(orders.status, 'draft')
      ];
      
      if (associatedOrderIds.length > 0) {
        whereConditions.push(notInArray(orders.id, associatedOrderIds));
      }
      
      const clientDraftOrders = await db
        .select({
          order: orders,
          orderGroup: orderGroups
        })
        .from(orders)
        .innerJoin(orderGroups, eq(orderGroups.orderId, orders.id))
        .where(and(...whereConditions));

      draftOrders = clientDraftOrders.map(({ order, orderGroup }) => ({
        id: order.id,
        accountName: order.accountName,
        accountEmail: order.accountEmail,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        itemCount: orderGroup.linkCount, // Use itemCount for compatibility with OrderSelectionModal
        totalRetail: order.totalRetail
      }));
    }

    return NextResponse.json({
      associatedOrders,
      draftOrders,
      defaultOrderId: associatedOrders.length > 0 ? associatedOrders[0].id : null
    });

  } catch (error) {
    console.error('Error fetching associated orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}