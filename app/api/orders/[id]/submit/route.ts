import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { createOrderBenchmark } from '@/lib/orders/benchmarkUtils';

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
      
      if (order.status !== 'draft') {
        throw new Error('Order must be in draft status to submit');
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
        
      // Create benchmark snapshot of the submitted order
      // This captures what the client originally requested
      let benchmark;
      try {
        benchmark = await createOrderBenchmark(orderId, session.userId, 'order_submitted');
        console.log(`✅ Created benchmark for submitted order ${orderId}`);
      } catch (benchmarkError) {
        console.error('Failed to create benchmark on submission:', benchmarkError);
        // Don't fail the submission if benchmark creation fails
      }
        
      // TODO: Send notification to internal team about new order submission
      // This could trigger an email or internal notification
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        benchmark: benchmark,
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