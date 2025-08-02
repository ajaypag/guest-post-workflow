import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and, ne, or, notInArray } from 'drizzle-orm';
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

    // Get all orders associated with this project
    const associations = await db
      .select({
        association: projectOrderAssociations,
        order: orders,
        orderGroup: orderGroups
      })
      .from(projectOrderAssociations)
      .innerJoin(orders, eq(projectOrderAssociations.orderId, orders.id))
      .innerJoin(orderGroups, eq(projectOrderAssociations.orderGroupId, orderGroups.id))
      .where(eq(projectOrderAssociations.projectId, params.projectId));

    // Filter orders based on status - exclude completed and cancelled orders
    const activeOrders = associations.filter(({ order }) => {
      return order.status !== 'completed' && order.status !== 'cancelled';
    });

    // Transform the data for the frontend
    const associatedOrders = activeOrders.map(({ association, order, orderGroup }) => ({
      id: order.id,
      accountName: order.accountName,
      accountEmail: order.accountEmail,
      status: order.status,
      state: order.state,
      createdAt: order.createdAt,
      itemCount: orderGroup.linkCount, // Use itemCount for compatibility with OrderSelectionModal
      totalRetail: order.totalRetail,
      associationType: association.associationType,
      orderGroupId: orderGroup.id,
      clientId: orderGroup.clientId
    }));

    // Also get draft orders for this client (backward compatibility)
    // First get the client ID from the first association
    const clientId = associations[0]?.orderGroup.clientId;
    let draftOrders: any[] = [];
    
    if (clientId) {
      // Get all draft orders for this client that aren't already associated
      const associatedOrderIds = associations.map(a => a.order.id);
      
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
        state: order.state,
        createdAt: order.createdAt,
        itemCount: orderGroup.linkCount, // Use itemCount for compatibility with OrderSelectionModal
        totalRetail: order.totalRetail,
        orderGroupId: orderGroup.id,
        clientId: orderGroup.clientId
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