import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const params = await context.params;
    const { id: orderId, lineItemId: itemId } = params;
    
    // Get user session
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      status, notes, targetPageUrl, anchorText, assignedDomain, publishedUrl,
      estimatedPrice, approvedPrice, wholesalePrice, metadata 
    } = body;
    
    // Get the order to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    }
    
    // Get the line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, itemId),
        eq(orderLineItems.orderId, orderId)
      )
    });
    
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
      modifiedAt: new Date() // Track when line item was last modified for invoice regeneration
    };
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    // Build metadata updates
    const currentMetadata = (lineItem.metadata as any) || {};
    let metadataUpdated = false;
    
    // If metadata is passed directly (e.g., for inclusion status update)
    if (metadata !== undefined) {
      Object.assign(currentMetadata, metadata);
      metadataUpdated = true;
    }
    
    if (notes !== undefined) {
      currentMetadata.notes = notes;
      metadataUpdated = true;
    }
    
    // Ensure inclusionStatus defaults to 'included' if not set
    if (!currentMetadata.inclusionStatus) {
      currentMetadata.inclusionStatus = 'included';
      metadataUpdated = true;
    }
    
    if (metadataUpdated) {
      updateData.metadata = currentMetadata;
    }
    
    if (targetPageUrl !== undefined) {
      updateData.targetPageUrl = targetPageUrl;
    }
    
    if (anchorText !== undefined) {
      updateData.anchorText = anchorText;
    }
    
    if (assignedDomain !== undefined) {
      updateData.assignedDomain = assignedDomain;
    }
    
    if (publishedUrl !== undefined) {
      updateData.publishedUrl = publishedUrl;
    }

    // Price updates (only for internal users)
    if (session.userType === 'internal') {
      if (estimatedPrice !== undefined) {
        updateData.estimatedPrice = estimatedPrice;
      }
      
      if (approvedPrice !== undefined) {
        updateData.approvedPrice = approvedPrice;
      }
      
      if (wholesalePrice !== undefined) {
        updateData.wholesalePrice = wholesalePrice;
      }
    }
    
    // Update the line item
    const [updatedItem] = await db
      .update(orderLineItems)
      .set(updateData)
      .where(eq(orderLineItems.id, itemId))
      .returning();
    
    return NextResponse.json({
      success: true,
      lineItem: updatedItem
    });
    
  } catch (error) {
    console.error('Error updating line item:', error);
    return NextResponse.json(
      { error: 'Failed to update line item' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const params = await context.params;
    const { id: orderId, lineItemId: itemId } = params;
    
    // Get user session
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the line item with related data
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, itemId),
        eq(orderLineItems.orderId, orderId)
      ),
      with: {
        client: true,
        order: true
      }
    });
    
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      if (lineItem.order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
      }
    }
    
    return NextResponse.json(lineItem);
    
  } catch (error) {
    console.error('Error fetching line item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch line item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  try {
    const params = await context.params;
    const { id: orderId, lineItemId: itemId } = params;
    
    // Get user session
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the order to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    const canDelete = session.userType === 'internal' || 
                      (session.userType === 'account' && order.accountId === session.userId);
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Cannot delete line items for this order' 
      }, { status: 403 });
    }
    
    // For account users, check if order is still editable
    if (session.userType === 'account') {
      const editableStatuses = [
        'draft', 'pending_confirmation', 'confirmed', 
        'sites_ready', 'client_reviewing', 'client_approved', 'invoiced'
      ];
      
      if (!editableStatuses.includes(order.status)) {
        return NextResponse.json({ 
          error: `Cannot delete line items in status: '${order.status}'` 
        }, { status: 400 });
      }
    }
    
    // Get the line item to ensure it exists and belongs to this order
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, itemId),
        eq(orderLineItems.orderId, orderId)
      )
    });
    
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }
    
    // Instead of hard delete, mark as cancelled to preserve history
    const [deletedItem] = await db
      .update(orderLineItems)
      .set({
        status: 'cancelled',
        modifiedAt: new Date(),
        metadata: {
          ...(lineItem.metadata as any || {}),
          cancelledAt: new Date().toISOString(),
          cancelledBy: session.userId,
          cancelledByEmail: session.email
        }
      })
      .where(eq(orderLineItems.id, itemId))
      .returning();
    
    // Update order totals
    const remainingItems = await db.query.orderLineItems.findMany({
      where: and(
        eq(orderLineItems.orderId, orderId),
        eq(orderLineItems.status, 'active')
      )
    });
    
    const newTotal = remainingItems.reduce((sum, item) => 
      sum + (item.approvedPrice || item.estimatedPrice || 0), 0
    );
    
    await db.update(orders)
      .set({
        totalRetail: newTotal,
        estimatedLinksCount: remainingItems.length,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
    
    return NextResponse.json({
      success: true,
      message: 'Line item cancelled successfully',
      lineItem: deletedItem
    });
    
  } catch (error) {
    console.error('Error deleting line item:', error);
    return NextResponse.json(
      { error: 'Failed to delete line item' },
      { status: 500 }
    );
  }
}