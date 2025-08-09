import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only internal users can update order state
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Forbidden - Only internal users can update order state' }, { status: 403 });
    }
    
    // Get request body
    const { state, notes } = await request.json();
    
    // Validate state
    const validStates = [
      'configuring',
      'awaiting_review',
      'analyzing',
      'sites_ready',
      'reviewing',
      'payment_pending',
      'in_progress',
      'completed'
    ];
    
    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ 
        error: `Invalid state. Must be one of: ${validStates.join(', ')}` 
      }, { status: 400 });
    }
    
    // Get the order to check current status
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.id)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Validate state transitions
    const stateTransitions: Record<string, string[]> = {
      'analyzing': ['sites_ready', 'reviewing'],
      'sites_ready': ['reviewing', 'payment_pending'],
      'reviewing': ['payment_pending', 'in_progress'],
      'payment_pending': ['in_progress'],
      'in_progress': ['completed']
    };
    
    const currentState = order.state || 'configuring';
    const allowedTransitions = stateTransitions[currentState] || [];
    
    if (!allowedTransitions.includes(state)) {
      return NextResponse.json({ 
        error: `Cannot transition from '${currentState}' to '${state}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}` 
      }, { status: 400 });
    }
    
    // Update the order state
    const [updatedOrder] = await db
      .update(orders)
      .set({
        state,
        updatedAt: new Date(),
        ...(notes && { internalNotes: order.internalNotes ? `${order.internalNotes}\n\n[State Update] ${new Date().toISOString()}: ${notes}` : notes })
      })
      .where(eq(orders.id, params.id))
      .returning();
      
    // Log the state change
    console.log(`Order ${params.id} state updated from '${currentState}' to '${state}' by user ${session.userId}`);
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      previousState: currentState,
      newState: state
    });
    
  } catch (error: any) {
    console.error('Error updating order state:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order state' },
      { status: 500 }
    );
  }
}