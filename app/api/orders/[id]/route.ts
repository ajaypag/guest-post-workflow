import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the order with relationships
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true,
        items: true
      },
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Manually fetch orderGroups
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, id));
    
    // Transform the data
    const orderWithGroups = {
      ...order,
      orderGroups: orderGroupsData.map(({ orderGroup, client }) => ({
        ...orderGroup,
        client,
        // Extract packageType and packagePrice from requirementOverrides
        packageType: orderGroup.requirementOverrides?.packageType || 'better',
        packagePrice: orderGroup.requirementOverrides?.packagePrice || 0
      }))
    };

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

    return NextResponse.json(orderWithGroups);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    
    // First fetch the order to check ownership
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      // Account users can only update their own orders
      if (existingOrder.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Only allow updating draft orders
      if (existingOrder.status !== 'draft') {
        return NextResponse.json({ 
          error: 'Only draft orders can be edited' 
        }, { status: 400 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and account owners can update orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Start a transaction to update order and groups
    await db.transaction(async (tx) => {
      // Update the order fields (excluding orderGroups)
      const { orderGroups: newOrderGroups, ...orderData } = data;
      
      await tx
        .update(orders)
        .set({
          ...orderData,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      
      // If orderGroups are provided, update them
      if (newOrderGroups && Array.isArray(newOrderGroups)) {
        // Delete existing order groups
        await tx.delete(orderGroups).where(eq(orderGroups.orderId, id));
        
        // Insert new order groups
        for (const group of newOrderGroups) {
          await tx.insert(orderGroups).values({
            id: crypto.randomUUID(),
            orderId: id,
            clientId: group.clientId,
            linkCount: group.linkCount || 1,
            targetPages: group.targetPages || [],
            anchorTexts: group.anchorTexts || [],
            requirementOverrides: {
              ...(group.requirementOverrides || {}),
              packageType: group.packageType,
              packagePrice: group.packagePrice
            },
            groupStatus: group.groupStatus || 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    });

    // Fetch the updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true,
        items: true
      },
    });
    
    // Manually fetch orderGroups
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, id));
    
    // Transform the data
    const orderWithGroups = {
      ...updatedOrder,
      orderGroups: orderGroupsData.map(({ orderGroup, client }) => ({
        ...orderGroup,
        client,
        // Extract packageType and packagePrice from requirementOverrides
        packageType: orderGroup.requirementOverrides?.packageType || 'better',
        packagePrice: orderGroup.requirementOverrides?.packagePrice || 0
      }))
    };

    return NextResponse.json(orderWithGroups);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // First, fetch the order to check its status and ownership
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      // Account users can only delete their own draft orders
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Only allow deletion of draft orders in configuring state
      if (order.status !== 'draft') {
        return NextResponse.json({ 
          error: 'Only draft orders can be deleted' 
        }, { status: 400 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and accounts can delete orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // For internal users, they can delete any order (no status check)

    // Delete the order (items and orderGroups will be cascade deleted)
    await db.delete(orders).where(eq(orders.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}