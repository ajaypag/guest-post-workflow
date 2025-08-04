import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    
    const { id: orderId } = await params;
    
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Get the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
        
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Verify ownership
      if (session.userType === 'account' && order.accountId !== session.userId) {
        throw new Error('Access denied. You can only submit your own orders.');
      }
      
      console.log('SUBMIT DEBUG:', {
        orderId: orderId,
        foundStatus: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        accountId: order.accountId
      });
      
      if (order.status !== 'draft') {
        throw new Error(`Order must be in draft status to submit. Current status: '${order.status}'`);
      }
      
      // Update order status to pending_confirmation
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'pending_confirmation',
          state: 'awaiting_review',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();
        
      // TODO: Send notification to internal team about new order submission
      // This could trigger an email or internal notification
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: 'Order submitted successfully. Our team will review and begin processing shortly.'
      });
    });
    
  } catch (error: any) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit order' },
      { status: 500 }
    );
  }
}