import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders, orderGroups, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: orderId } = await params;
    
    // Get the order first to check permissions
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
      
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions based on user type
    if (session.userType === 'internal') {
      // Internal users can view any order
    } else if (session.userType === 'account') {
      // Account users can only view their own orders
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - You can only view your own orders' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }
    
    // Get order groups with client details
    const groups = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .innerJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, orderId));
      
    // Format the response
    const formattedGroups = groups.map(({ orderGroup, client }) => ({
      id: orderGroup.id,
      clientId: orderGroup.clientId,
      linkCount: orderGroup.linkCount,
      targetPages: orderGroup.targetPages || [],
      client: {
        id: client.id,
        name: client.name,
        website: client.website
      }
    }));
    
    return NextResponse.json({
      groups: formattedGroups,
      totalGroups: formattedGroups.length,
      totalLinks: formattedGroups.reduce((sum, g) => sum + g.linkCount, 0)
    });
    
  } catch (error: any) {
    console.error('Error fetching order groups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order groups' },
      { status: 500 }
    );
  }
}