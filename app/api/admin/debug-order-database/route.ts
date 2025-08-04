import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can access this debug endpoint
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied. Internal users only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    console.log('🔍 DEBUG ORDER DATABASE - Querying for orderId:', orderId);

    // First, get the order itself
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      console.log('❌ Order not found in database');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('✅ Found order:', {
      id: order.id,
      status: order.status,
      state: order.state,
      accountId: order.accountId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });

    // Get all order groups for this order
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, orderId));

    console.log('📊 Found order groups:', orderGroupsData.length);

    const groupsWithDetails = orderGroupsData.map(({ orderGroup, client }) => {
      console.log('📋 Order Group:', {
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        clientName: client?.name,
        linkCount: orderGroup.linkCount,
        targetPagesCount: orderGroup.targetPages?.length || 0,
        anchorTextsCount: orderGroup.anchorTexts?.length || 0,
        groupStatus: orderGroup.groupStatus
      });

      return {
        id: orderGroup.id,
        orderId: orderGroup.orderId,
        clientId: orderGroup.clientId,
        linkCount: orderGroup.linkCount,
        targetPages: orderGroup.targetPages,
        anchorTexts: orderGroup.anchorTexts,
        requirementOverrides: orderGroup.requirementOverrides,
        groupStatus: orderGroup.groupStatus,
        createdAt: orderGroup.createdAt,
        updatedAt: orderGroup.updatedAt,
        client: client ? {
          id: client.id,
          name: client.name,
          website: client.website
        } : null
      };
    });

    const result = {
      id: order.id,
      status: order.status,
      state: order.state,
      orderType: order.orderType,
      accountId: order.accountId,
      totalRetail: order.totalRetail,
      totalWholesale: order.totalWholesale,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderGroups: groupsWithDetails
    };

    console.log('🎯 FINAL RESULT:', {
      orderId: result.id,
      status: result.status,
      orderGroupsCount: result.orderGroups.length,
      totalTargetPages: result.orderGroups.reduce((sum, g) => sum + (g.targetPages?.length || 0), 0)
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 Error in debug-order-database:', error);
    return NextResponse.json(
      { error: 'Failed to query database' },
      { status: 500 }
    );
  }
}