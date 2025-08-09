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
        orderName: orders.name,
        orderState: orders.state,
        orderStatus: orders.status,
        orderTotalPrice: orders.totalPrice,
        orderGroupName: orderGroups.name,
        orderGroupLinkCount: orderGroups.linkCount,
        clientId: orderGroups.clientId
      })
      .from(projectOrderAssociations)
      .leftJoin(orders, eq(projectOrderAssociations.orderId, orders.id))
      .leftJoin(orderGroups, eq(projectOrderAssociations.orderGroupId, orderGroups.id))
      .where(eq(projectOrderAssociations.projectId, params.projectId));
    
    // Format the response
    const formattedOrders = associations.map(assoc => ({
      orderId: assoc.orderId,
      orderName: assoc.orderName || 'Unknown Order',
      orderGroupId: assoc.orderGroupId,
      orderGroupName: assoc.orderGroupName || 'Unknown Group',
      createdAt: assoc.createdAt,
      state: assoc.orderState,
      status: assoc.orderStatus,
      totalPrice: assoc.orderTotalPrice,
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