import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq } from 'drizzle-orm';
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
    
    // Fetch all order associations for this project
    const associations = await db
      .select({
        associationId: projectOrderAssociations.id,
        orderId: projectOrderAssociations.orderId,
        orderGroupId: projectOrderAssociations.orderGroupId,
        associationType: projectOrderAssociations.associationType,
        createdAt: projectOrderAssociations.createdAt,
        orderType: orders.orderType,
        orderState: orders.state,
        orderStatus: orders.status,
        orderTotalRetail: orders.totalRetail,
        orderCreatedAt: orders.createdAt,
        orderGroupLinkCount: orderGroups.linkCount,
        clientId: orderGroups.clientId
      })
      .from(projectOrderAssociations)
      .leftJoin(orders, eq(projectOrderAssociations.orderId, orders.id))
      .leftJoin(orderGroups, eq(projectOrderAssociations.orderGroupId, orderGroups.id))
      .where(eq(projectOrderAssociations.projectId, params.projectId));
    
    // Format the response with generated names based on order ID and date
    const formattedOrders = associations.map(assoc => ({
      orderId: assoc.orderId,
      // Generate a name from order ID and date
      orderName: `Order #${assoc.orderId.substring(0, 8)}`,
      orderGroupId: assoc.orderGroupId,
      // Generate group name from group ID and link count
      orderGroupName: `Group ${assoc.orderGroupId.substring(0, 4)} (${assoc.orderGroupLinkCount || 0} links)`,
      createdAt: assoc.createdAt || assoc.orderCreatedAt,
      state: assoc.orderState,
      status: assoc.orderStatus,
      totalPrice: assoc.orderTotalRetail,
      linkCount: assoc.orderGroupLinkCount,
      associationType: assoc.associationType,
      clientId: assoc.clientId
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