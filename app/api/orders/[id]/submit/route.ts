import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { users } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { createOrderBenchmark } from '@/lib/orders/benchmarkUtils';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

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
    
    // Parse request body for optional flags
    const body = await request.json().catch(() => ({}));
    const isQuickStart = body.quickStart === true;
    
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
      
      // Calculate pricing from line items before submitting
      const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
      const lineItems = await tx.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, orderId)
      });
      
      let subtotalRetail = 0;
      let totalRetail = 0;
      let totalWholesale = 0;
      let totalLineItems = 0;
      
      lineItems.forEach(item => {
        const itemPrice = item.estimatedPrice || 0;
        if (itemPrice > 0) {
          subtotalRetail += itemPrice;
          totalRetail += itemPrice;
          totalLineItems++;
          // Calculate wholesale (subtract service fee)
          const wholesalePrice = Math.max(itemPrice - SERVICE_FEE_CENTS, 0);
          totalWholesale += wholesalePrice;
        }
      });
      
      const estimatedPricePerLink = totalLineItems > 0 
        ? Math.round(totalRetail / totalLineItems)
        : null;
      
      const profitMargin = totalRetail > 0 
        ? Math.round(((totalRetail - totalWholesale) / totalRetail) * 100)
        : 0;
      
      // Update order status to pending_confirmation with calculated totals
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'pending_confirmation',
          state: 'awaiting_review',
          subtotalRetail: subtotalRetail,
          totalRetail: totalRetail,
          totalWholesale: totalWholesale,
          profitMargin: profitMargin,
          estimatedPricePerLink: estimatedPricePerLink,
          estimatedLinksCount: totalLineItems,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();
        
      // Create benchmark snapshot of the submitted order
      // This captures what the client originally requested
      let benchmark;
      try {
        // For external users, we need to use a valid user ID from the users table
        // We'll use the system user or the first admin user
        let capturedByUserId = session.userId;
        
        if (session.userType === 'account') {
          // Find a system user or admin to attribute this to
          const systemUser = await tx.query.users.findFirst({
            where: (users, { or, eq }) => or(
              eq(users.email, 'system@internal.postflow'),
              eq(users.role, 'admin')
            ),
            orderBy: (users, { asc }) => [asc(users.createdAt)]
          });
          
          if (systemUser) {
            capturedByUserId = systemUser.id;
          } else {
            // If no admin exists, skip benchmark creation for now
            throw new Error('No system user available for benchmark creation');
          }
        }
        
        benchmark = await createOrderBenchmark(orderId, capturedByUserId, 'order_submitted');
        console.log(`✅ Created benchmark for submitted order ${orderId}`);
      } catch (benchmarkError) {
        console.error('Failed to create benchmark on submission:', benchmarkError);
        // Don't fail the submission if benchmark creation fails
      }
        
      // TODO: Send notification to internal team about new order submission
      // This could trigger an email or internal notification
      
      // Log QuickStart orders for internal visibility
      if (isQuickStart) {
        console.log(`🚀 QuickStart Order Submitted: ${orderId}`);
        console.log(`  Account: ${order.accountId}`);
        console.log(`  Status: ${updatedOrder.status}`);
        console.log(`  Total: $${(updatedOrder.totalRetail || 0) / 100}`);
        // In production, this would send a Slack notification or email
      }
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        benchmark: benchmark,
        message: isQuickStart 
          ? 'Order created successfully! Our team will begin processing your order within 24 hours.'
          : 'Order submitted successfully. Our team will review and begin processing shortly.',
        isQuickStart
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