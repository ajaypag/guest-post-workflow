import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders, orderStatusHistory } from '@/lib/db/orderSchema';
import { users } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { createOrderBenchmark } from '@/lib/orders/benchmarkUtils';
import { v4 as uuidv4 } from 'uuid';
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
    const body = await request.json();
    const { notes } = body; // Optional notes about what changed
    
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
        throw new Error('Access denied. You can only resubmit your own orders.');
      }
      
      // Check if order is in a resubmittable state
      const resubmittableStatuses = ['pending_confirmation', 'confirmed'];
      if (!resubmittableStatuses.includes(order.status)) {
        throw new Error(`Order cannot be resubmitted. Current status: ${order.status}. Orders can only be resubmitted when pending confirmation or confirmed.`);
      }
      
      // Track resubmission count in internal notes
      // Parse existing notes to find resubmission count
      const existingNotes = order.internalNotes || '';
      const resubmissionMatch = existingNotes.match(/\[RESUBMISSIONS: (\d+)\]/);
      const currentResubmissions = resubmissionMatch ? parseInt(resubmissionMatch[1]) : 0;
      const newResubmissionCount = currentResubmissions + 1;
      
      // Update internal notes with resubmission tracking
      const resubmissionTimestamp = new Date().toISOString();
      const resubmissionInfo = `\n[RESUBMISSION #${newResubmissionCount}] ${resubmissionTimestamp} by ${session.email}${notes ? `: ${notes}` : ''}`;
      
      // Update or add the resubmission counter
      let updatedInternalNotes = existingNotes;
      if (resubmissionMatch) {
        updatedInternalNotes = existingNotes.replace(
          /\[RESUBMISSIONS: \d+\]/,
          `[RESUBMISSIONS: ${newResubmissionCount}]`
        );
      } else {
        updatedInternalNotes = `[RESUBMISSIONS: ${newResubmissionCount}]` + 
          (existingNotes ? '\n' + existingNotes : '');
      }
      updatedInternalNotes += resubmissionInfo;
      
      // Calculate pricing from line items before resubmitting
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
      
      // Update order - keep status as pending_confirmation but update notes and pricing
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'pending_confirmation',
          state: 'awaiting_review',
          internalNotes: updatedInternalNotes,
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
        
      // Log status change in history
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId,
        oldStatus: order.status,
        newStatus: 'pending_confirmation',
        changedBy: session.userId,
        changedAt: new Date(),
        notes: `Order resubmitted for review${notes ? `: ${notes}` : ''}. Resubmission #${newResubmissionCount}`
      });
        
      // Log notification for internal team (TODO: Implement actual notification system)
      console.log('[ORDER_RESUBMIT] Order resubmitted:', {
        orderId,
        resubmittedBy: session.email,
        resubmissionCount: newResubmissionCount,
        notes: notes || null,
        timestamp: new Date().toISOString()
      });
      
      // TODO: In the future, implement email notifications here
      // For now, the order status history and metadata tracking is sufficient
      
      // Create benchmark snapshot of the resubmitted order
      let benchmark;
      try {
        // For external users, we need to use a valid user ID from the users table
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
        
        benchmark = await createOrderBenchmark(
          orderId, 
          capturedByUserId, 
          'client_revision' // Use standard type for resubmissions
        );
      } catch (benchmarkError) {
        console.error('Failed to create benchmark:', benchmarkError);
        // Don't fail if benchmark creation fails
      }
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: `Order successfully resubmitted for review (resubmission #${newResubmissionCount})`,
        resubmissionCount: newResubmissionCount,
        benchmark: benchmark || null
      });
    });
    
  } catch (error: any) {
    console.error('Error resubmitting order:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to resubmit order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: error.message?.includes('Access denied') ? 403 : 400 }
    );
  }
}