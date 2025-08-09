import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can update order state
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Forbidden - Only internal users can update order state' }, { status: 403 });
    }

    const { id } = await params;
    const { state } = await request.json();

    // Validate the state value
    const validStates = [
      'analyzing',
      'sites_ready',
      'client_reviewing',
      'selections_confirmed',
      'payment_received',
      'workflows_generated',
      'in_progress'
    ];

    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ 
        error: `Invalid state. Valid states are: ${validStates.join(', ')}` 
      }, { status: 400 });
    }

    // First fetch the order to check it exists
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Track state changes for notification purposes
    const stateChangeMetadata: any = {
      previousState: existingOrder.state,
      newState: state,
      changedBy: session.userId,
      changedAt: new Date().toISOString()
    };

    // If marking sites ready, add notification flag
    if (state === 'sites_ready') {
      stateChangeMetadata.notifyAccount = true;
      stateChangeMetadata.notificationMessage = 'Sites are ready for your review';
    }

    // Update the order state
    await db
      .update(orders)
      .set({
        state,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id));

    // Fetch the updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true
      },
    });

    // Send notification email if sites are ready
    if (state === 'sites_ready' && updatedOrder?.account?.email) {
      try {
        // Send email notification (using existing email service)
        console.log(`[STATE_UPDATE] Would send notification email to ${updatedOrder.account.email} for order ${id}`);
        // TODO: Implement actual email sending when email service is configured
      } catch (error) {
        console.error('Failed to send notification email:', error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order state:', error);
    return NextResponse.json(
      { error: 'Failed to update order state' },
      { status: 500 }
    );
  }
}