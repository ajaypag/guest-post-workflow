import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

// Define valid status transitions (forward and backward)
const STATUS_TRANSITIONS: Record<string, { forward: string[], backward: string[] }> = {
  'draft': {
    forward: ['pending_confirmation'],
    backward: []
  },
  'pending_confirmation': {
    forward: ['confirmed'],
    backward: ['draft']
  },
  'confirmed': {
    forward: ['paid'], // After invoice & payment
    backward: ['pending_confirmation'] // Only if no invoice generated
  },
  'paid': {
    forward: ['completed'],
    backward: ['confirmed'] // Only if no workflows generated
  },
  'completed': {
    forward: [],
    backward: ['paid'] // Rare, but possible if need to regenerate content
  }
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { newStatus, force = false } = await request.json();

    // Get current order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = order.status;

    // Check if transition is valid
    const validTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!validTransitions) {
      return NextResponse.json({ 
        error: 'Unknown current status' 
      }, { status: 400 });
    }

    const isForward = validTransitions.forward.includes(newStatus);
    const isBackward = validTransitions.backward.includes(newStatus);

    if (!isForward && !isBackward) {
      return NextResponse.json({ 
        error: `Cannot transition from ${currentStatus} to ${newStatus}` 
      }, { status: 400 });
    }

    // Check for dangerous rollbacks
    const warnings: string[] = [];
    if (isBackward && !force) {
      // Check for conditions that would make rollback problematic
      if (currentStatus === 'confirmed' && newStatus === 'pending_confirmation' && order.invoicedAt) {
        warnings.push('Order has an invoice generated. Rolling back will not delete the invoice.');
      }
      
      if (currentStatus === 'paid' && newStatus === 'confirmed') {
        // Check if workflows exist (you'd need to add this check)
        warnings.push('Check if workflows have been generated. Rolling back will not delete workflows.');
        
        if (order.paidAt) {
          warnings.push('Order is marked as paid. Ensure payment is properly handled.');
        }
      }

      if (currentStatus === 'completed') {
        warnings.push('Order is completed. Content may have been published. Proceed with caution.');
      }

      // If there are warnings and force is not set, return them
      if (warnings.length > 0) {
        return NextResponse.json({
          requiresConfirmation: true,
          warnings,
          message: 'This rollback may have consequences. Set force=true to proceed.'
        }, { status: 200 });
      }
    }

    // Perform the status update
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Clear certain fields on rollback
    if (isBackward) {
      if (newStatus === 'pending_confirmation') {
        updateData.approvedAt = null;
        updateData.approvedBy = null;
      }
      if (newStatus === 'confirmed') {
        updateData.paidAt = null;
      }
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status ${isBackward ? 'rolled back' : 'updated'} from ${currentStatus} to ${newStatus}`,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

// Get available status transitions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Get current order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = order.status;
    const transitions = STATUS_TRANSITIONS[currentStatus] || { forward: [], backward: [] };

    return NextResponse.json({
      currentStatus,
      availableTransitions: {
        forward: transitions.forward,
        backward: transitions.backward
      },
      orderState: {
        hasInvoice: !!order.invoicedAt,
        isPaid: !!order.paidAt,
        isApproved: !!order.approvedAt
      }
    });

  } catch (error) {
    console.error('Error getting status transitions:', error);
    return NextResponse.json(
      { error: 'Failed to get status transitions' },
      { status: 500 }
    );
  }
}