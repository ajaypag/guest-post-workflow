import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Get order details by share token (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find order by share token
    const order = await db.query.orders.findFirst({
      where: eq(orders.shareToken, token),
      with: {
        account: {
          columns: {
            companyName: true,
            contactName: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Check if token is expired
    if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Get order groups with client info
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, order.id));

    // Format response (limited info for public view)
    const publicOrder = {
      id: order.id,
      status: order.status,
      state: order.state,
      totalPrice: order.totalRetail,
      totalWholesale: order.totalWholesale,
      includesClientReview: order.includesClientReview,
      rushDelivery: order.rushDelivery,
      shareExpiresAt: order.shareExpiresAt,
      account: order.account ? {
        companyName: order.account.companyName,
        contactName: order.account.contactName
      } : null,
      orderGroups: orderGroupsData.map(({ orderGroup, client }) => ({
        id: orderGroup.id,
        clientId: orderGroup.clientId,
        linkCount: orderGroup.linkCount,
        targetPages: orderGroup.targetPages,
        client: client ? {
          id: client.id,
          name: client.name,
          website: client.website
        } : null
      }))
    };

    return NextResponse.json({ 
      success: true,
      order: publicOrder
    });

  } catch (error: any) {
    console.error('Error fetching order by token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load order' },
      { status: 500 }
    );
  }
}