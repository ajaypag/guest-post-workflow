import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orderItems, orders } from '@/lib/db/orderSchema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - temporarily disabled for testing
    // const session = await AuthServiceServer.getSession(request);
    // if (!session || session.userType !== 'internal') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const { id: orderId } = await params;
    console.log(`🧹 Clearing workflows for order: ${orderId}`);
    
    // First, get all workflow IDs associated with this order's line items
    const lineItemsWithWorkflows = await db
      .select({ 
        workflowId: orderLineItems.workflowId,
        lineItemId: orderLineItems.id 
      })
      .from(orderLineItems)
      .where(and(
        eq(orderLineItems.orderId, orderId),
        sql`${orderLineItems.workflowId} IS NOT NULL`
      ));
    
    console.log(`Found ${lineItemsWithWorkflows.length} line items with workflows`);
    
    let deletedWorkflowsCount = 0;
    let clearedLineItemsCount = 0;
    let clearedOrderItemsCount = 0;
    
    if (lineItemsWithWorkflows.length > 0) {
      const workflowIds = lineItemsWithWorkflows
        .filter(item => item.workflowId)
        .map(item => item.workflowId as string);
      
      // First clear workflow references, then delete workflows
      if (workflowIds.length > 0) {
        // Clear guest_post_items references first
        const { guestPostItems } = await import('@/lib/db/orderSchema');
        await db
          .update(guestPostItems)
          .set({ workflowId: null })
          .where(inArray(guestPostItems.workflowId, workflowIds));
        
        // Now delete the workflows
        const deletedWorkflows = await db
          .delete(workflows)
          .where(inArray(workflows.id, workflowIds))
          .returning({ id: workflows.id });
        
        deletedWorkflowsCount = deletedWorkflows.length;
        console.log(`✅ Deleted ${deletedWorkflowsCount} workflows`);
      }
      
      // Clear workflow IDs from line items
      const updatedLineItems = await db
        .update(orderLineItems)
        .set({ 
          workflowId: null,
          modifiedAt: new Date()
        })
        .where(eq(orderLineItems.orderId, orderId))
        .returning({ id: orderLineItems.id });
      
      clearedLineItemsCount = updatedLineItems.length;
      console.log(`✅ Cleared workflow IDs from ${clearedLineItemsCount} line items`);
    }
    
    // Also check and clear order_items table (legacy)
    const orderItemsWithWorkflows = await db
      .select({ 
        workflowId: orderItems.workflowId,
        id: orderItems.id 
      })
      .from(orderItems)
      .where(and(
        eq(orderItems.orderId, orderId),
        sql`${orderItems.workflowId} IS NOT NULL`
      ));
    
    if (orderItemsWithWorkflows.length > 0) {
      const updatedOrderItems = await db
        .update(orderItems)
        .set({ 
          workflowId: null,
          workflowStatus: 'pending',
          workflowCreatedAt: null,
          updatedAt: new Date()
        })
        .where(eq(orderItems.orderId, orderId))
        .returning({ id: orderItems.id });
      
      clearedOrderItemsCount = updatedOrderItems.length;
      console.log(`✅ Cleared workflow data from ${clearedOrderItemsCount} order items (legacy)`);
    }
    
    // Update order state back to allow workflow generation
    const updatedOrder = await db
      .update(orders)
      .set({
        totalWorkflows: 0,
        completedWorkflows: 0,
        fulfillmentStartedAt: null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id, state: orders.state });
    
    console.log(`✅ Reset order tracking fields`);
    
    return NextResponse.json({
      success: true,
      message: `Order ${orderId} is now ready for testing workflow generation!`,
      stats: {
        workflowsDeleted: deletedWorkflowsCount,
        lineItemsCleared: clearedLineItemsCount,
        orderItemsCleared: clearedOrderItemsCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error clearing workflows:', error);
    return NextResponse.json(
      { error: 'Failed to clear workflows', details: error },
      { status: 500 }
    );
  }
}