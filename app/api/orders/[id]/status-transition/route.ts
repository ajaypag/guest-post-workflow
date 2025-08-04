import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { OrderService } from '@/lib/services/orderService';

// Define allowed status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['pending_confirmation'],
  'pending_confirmation': ['confirmed', 'cancelled'],
  'confirmed': ['sites_ready', 'cancelled'],
  'sites_ready': ['client_reviewing', 'cancelled'],
  'client_reviewing': ['client_approved', 'sites_ready', 'cancelled'],
  'client_approved': ['invoiced', 'cancelled'],
  'invoiced': ['paid', 'cancelled'],
  'paid': ['in_progress', 'cancelled'],
  'in_progress': ['completed'],
  'completed': [],
  'cancelled': []
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const orderId = params.id;
  
  try {
    // Get user session
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { newStatus, notes } = await request.json();
    
    if (!newStatus) {
      return NextResponse.json({ error: 'New status is required' }, { status: 400 });
    }
    
    // Get the current order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        account: true
      }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Validate status transition
    const currentStatus = order.status;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${currentStatus} to ${newStatus}` 
      }, { status: 400 });
    }
    
    // Additional validation for specific transitions
    if (newStatus === 'client_approved') {
      // Could add validation here to ensure all required sites are approved
      // For now, we'll trust the frontend validation
    }
    
    // Update order status
    await OrderService.updateOrderStatus(orderId, newStatus, session.userId, notes);
    
    // Handle side effects based on status transition
    switch (newStatus) {
      case 'paid':
        // Create workflows for the order
        await OrderService.createWorkflowsForOrder(orderId, session.userId);
        break;
        
      case 'sites_ready':
        // Could send notification to client here
        break;
        
      case 'client_approved':
        // Could notify internal team to prepare invoice
        break;
    }
    
    return NextResponse.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      newStatus
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ 
      error: 'Failed to update order status' 
    }, { status: 500 });
  }
}