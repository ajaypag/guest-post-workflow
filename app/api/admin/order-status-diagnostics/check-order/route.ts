import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
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
    
    // Direct database query
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    return NextResponse.json({
      success: true,
      order: order || null,
      query: `SELECT * FROM orders WHERE id = '${orderId}'`
    });
    
  } catch (error: any) {
    console.error('Error checking order:', error);
    return NextResponse.json({
      error: error.message || 'Failed to check order',
      stack: error.stack
    }, { status: 500 });
  }
}