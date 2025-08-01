import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get user's draft orders
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all draft orders for this user
    const draftOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.createdBy, session.userId),
          eq(orders.status, 'draft')
        )
      )
      .orderBy(desc(orders.updatedAt));

    return NextResponse.json({ 
      drafts: draftOrders 
    });

  } catch (error) {
    console.error('Error fetching draft orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new draft order
export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderData } = await request.json();

    // Generate a unique ID
    const orderId = crypto.randomUUID();

    // Create new draft order with minimal required fields
    const [newOrder] = await db
      .insert(orders)
      .values({
        id: orderId,
        // Required fields
        accountEmail: orderData.accountEmail || '',
        accountName: orderData.accountName || '',
        
        // Order details
        orderType: 'guest_post',
        status: 'draft',
        state: 'configuring',
        
        // Pricing defaults
        subtotalRetail: 0,
        totalRetail: 0,
        totalWholesale: 0,
        profitMargin: 0,
        
        // Metadata
        createdBy: session.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ 
      orderId: newOrder.id,
      success: true 
    });

  } catch (error) {
    console.error('Error creating draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}