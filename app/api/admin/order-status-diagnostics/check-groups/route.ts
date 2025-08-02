import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId } = await request.json();
    
    // Query order groups with clients
    const groups = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, orderId));
    
    // Also get just the order groups without join to see raw data
    const rawGroups = await db
      .select()
      .from(orderGroups)
      .where(eq(orderGroups.orderId, orderId));
    
    return NextResponse.json({
      success: true,
      groups: groups,
      rawGroups: rawGroups,
      groupCount: groups.length,
      query: `SELECT * FROM order_groups WHERE order_id = '${orderId}'`
    });
    
  } catch (error: any) {
    console.error('Error checking order groups:', error);
    return NextResponse.json({
      error: error.message || 'Failed to check order groups',
      stack: error.stack
    }, { status: 500 });
  }
}