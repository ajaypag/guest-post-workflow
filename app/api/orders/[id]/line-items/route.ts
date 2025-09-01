import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, or, desc } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

/**
 * GET /api/orders/[id]/line-items
 * Get all line items for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth
    const session = await AuthServiceServer.getSession();
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
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const includeChanges = searchParams.get('includeChanges') === 'true';

    // Build query conditions
    const conditions = [eq(orderLineItems.orderId, orderId)];
    if (status) conditions.push(eq(orderLineItems.status, status));
    if (clientId) conditions.push(eq(orderLineItems.clientId, clientId));

    // Get line items with relations
    const lineItems = await db.query.orderLineItems.findMany({
      where: and(...conditions),
      with: {
        client: true,
        targetPage: true,
        assignedDomain: true,
        addedByUser: {
          columns: {
            id: true,
            email: true,
            name: true
          }
        },
        ...(includeChanges ? {
          changes: {
            orderBy: [desc(lineItemChanges.changedAt)],
            limit: 5,
            with: {
              changedByUser: {
                columns: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        } : {})
      },
      orderBy: [
        orderLineItems.displayOrder,
        orderLineItems.addedAt
      ]
    });

    // Calculate summary stats
    const summary = {
      total: lineItems.length,
      byStatus: lineItems.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byClient: lineItems.reduce((acc, item) => {
        const clientName = item.client?.name || `Client ${item.clientId.slice(0, 8)}`;
        acc[clientName] = (acc[clientName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalValue: lineItems.reduce((sum, item) => 
        sum + (item.approvedPrice || item.estimatedPrice || 0), 0
      ),
      deliveredCount: lineItems.filter(i => i.status === 'delivered' || i.status === 'completed').length,
      pendingCount: lineItems.filter(i => i.status === 'draft' || i.status === 'pending_selection').length
    };

    return NextResponse.json({
      lineItems,
      summary,
      orderId
    });

  } catch (error: any) {
    console.error('Error fetching line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch line items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/line-items
 * Create new line items (add links to order)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, reason } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'items array is required' 
      }, { status: 400 });
    }

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions - align with main order edit logic
    const canAdd = session.userType === 'internal' || 
                   (session.userType === 'account' && order.accountId === session.userId);

    if (!canAdd) {
      return NextResponse.json({ 
        error: 'Cannot add line items to this order' 
      }, { status: 403 });
    }

    // For account users, check if order is still editable (before payment phase)
    if (session.userType === 'account') {
      const editableStatuses = [
        'draft',                  // Creating order
        'pending_confirmation',   // Submitted but not confirmed
        'confirmed',             // Internal confirmed, analyzing
        'sites_ready',           // Sites selected for review
        'client_reviewing',      // Client reviewing sites
        'client_approved',       // Client approved sites
        'invoiced'               // Invoice sent but not paid - user can still edit
      ];
      
      const paymentLockedStatuses = [
        'payment_pending',       // Payment intent created - payment in process
        'payment_processing',    // Payment being processed
        'paid',                  // Payment received - LOCK HERE
        'in_progress',           // Work started
        'completed',             // Order completed
        'refunded',              // Refunded
        'partially_refunded'     // Partially refunded
      ];

      if (!editableStatuses.includes(order.status)) {
        if (paymentLockedStatuses.includes(order.status)) {
          return NextResponse.json({ 
            error: `Cannot add line items once payment process begins. Current status: '${order.status}'. Please contact support for assistance.` 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          error: `Cannot add line items in status: '${order.status}'` 
        }, { status: 400 });
      }
    }

    // Get current max display order
    const existingItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId),
      orderBy: [desc(orderLineItems.displayOrder)],
      limit: 1
    });

    let nextDisplayOrder = existingItems[0]?.displayOrder ?? -1;

    // Create line items with change tracking
    const createdItems = await db.transaction(async (tx) => {
      const batchId = crypto.randomUUID();
      const created = [];

      for (const item of items) {
        nextDisplayOrder++;

        // Validate required fields
        if (!item.clientId) {
          throw new Error('clientId is required for each line item');
        }

        // Create the line item with default inclusionStatus of 'included'
        const metadata = {
          ...item.metadata,
          inclusionStatus: item.metadata?.inclusionStatus || 'included'
        };
        
        const [lineItem] = await tx.insert(orderLineItems)
          .values({
            orderId,
            clientId: item.clientId,
            targetPageId: item.targetPageId,
            targetPageUrl: item.targetPageUrl,
            anchorText: item.anchorText,
            status: item.status || 'draft',
            // FIXED: Use assignedDomain from main field first, fall back to metadata for backward compatibility
            assignedDomain: item.assignedDomain || metadata?.assignedDomain,
            assignedDomainId: item.assignedDomainId || metadata?.assignedDomainId,
            assignedAt: (item.assignedDomain || metadata?.assignedDomain) ? new Date() : undefined,
            assignedBy: (item.assignedDomain || metadata?.assignedDomain) ? session.userId : undefined,
            estimatedPrice: item.estimatedPrice,
            wholesalePrice: item.wholesalePrice || metadata?.wholesalePrice,
            serviceFee: SERVICE_FEE_CENTS, // Service fee
            metadata,
            addedBy: session.userId,
            displayOrder: nextDisplayOrder,
            version: 1
          })
          .returning();

        created.push(lineItem);

        // Create change log entry
        await tx.insert(lineItemChanges).values({
          lineItemId: lineItem.id,
          orderId,
          changeType: 'created',
          newValue: {
            clientId: item.clientId,
            targetPageUrl: item.targetPageUrl,
            anchorText: item.anchorText
          },
          changedBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
          changeReason: reason || 'Line items added to order',
          batchId
        });
      }

      // Update order totals
      const allItems = await tx.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, orderId)
      });

      const newTotal = allItems.reduce((sum, item) => 
        sum + (item.approvedPrice || item.estimatedPrice || 0), 0
      );

      await tx.update(orders)
        .set({
          totalRetail: newTotal,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      return created;
    });

    return NextResponse.json({
      success: true,
      message: `${createdItems.length} line items added`,
      lineItems: createdItems
    });

  } catch (error: any) {
    console.error('Error creating line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create line items' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]/line-items
 * Bulk update line items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates, reason } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ 
        error: 'updates array is required' 
      }, { status: 400 });
    }

    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    const canEdit = session.userType === 'internal' || 
                    (session.userType === 'account' && order.accountId === session.userId);

    if (!canEdit) {
      return NextResponse.json({ 
        error: 'Cannot edit line items for this order' 
      }, { status: 403 });
    }

    // For account users, check if order is still editable (before payment phase)
    if (session.userType === 'account') {
      const editableStatuses = [
        'draft',                  // Creating order
        'pending_confirmation',   // Submitted but not confirmed
        'confirmed',             // Internal confirmed, analyzing
        'sites_ready',           // Sites selected for review
        'client_reviewing',      // Client reviewing sites
        'client_approved',       // Client approved sites
        'invoiced'               // Invoice sent but not paid - user can still edit
      ];
      
      const paymentLockedStatuses = [
        'payment_pending',       // Payment intent created - payment in process
        'payment_processing',    // Payment being processed
        'paid',                  // Payment received - LOCK HERE
        'in_progress',           // Work started
        'completed',             // Order completed
        'refunded',              // Refunded
        'partially_refunded'     // Partially refunded
      ];

      if (!editableStatuses.includes(order.status)) {
        if (paymentLockedStatuses.includes(order.status)) {
          return NextResponse.json({ 
            error: `Cannot edit line items once payment process begins. Current status: '${order.status}'. Please contact support for assistance.` 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          error: `Cannot edit line items in status: '${order.status}'` 
        }, { status: 400 });
      }
    }

    // Execute updates with change tracking
    const updatedItems = await db.transaction(async (tx) => {
      const batchId = crypto.randomUUID();
      const updated = [];

      for (const update of updates) {
        if (!update.id) {
          throw new Error('Line item ID is required for updates');
        }

        // Get current state
        const current = await tx.query.orderLineItems.findFirst({
          where: and(
            eq(orderLineItems.id, update.id),
            eq(orderLineItems.orderId, orderId)
          )
        });

        if (!current) {
          console.warn(`Line item ${update.id} not found, skipping`);
          continue;
        }

        // Build update object
        const updateData: any = {
          modifiedAt: new Date(),
          modifiedBy: session.userId,
          version: current.version + 1
        };

        // Track what changed
        const changes: any = {};

        // Handle field updates
        if (update.status !== undefined && update.status !== current.status) {
          updateData.status = update.status;
          changes.status = { from: current.status, to: update.status };
        }

        if (update.clientId !== undefined && update.clientId !== current.clientId) {
          updateData.clientId = update.clientId;
          changes.clientId = { from: current.clientId, to: update.clientId };
        }

        if (update.targetPageUrl !== undefined && update.targetPageUrl !== current.targetPageUrl) {
          updateData.targetPageUrl = update.targetPageUrl;
          changes.targetPageUrl = { from: current.targetPageUrl, to: update.targetPageUrl };
        }

        if (update.anchorText !== undefined && update.anchorText !== current.anchorText) {
          updateData.anchorText = update.anchorText;
          changes.anchorText = { from: current.anchorText, to: update.anchorText };
        }

        if (update.assignedDomainId !== undefined) {
          updateData.assignedDomainId = update.assignedDomainId;
          updateData.assignedDomain = update.assignedDomain;
          updateData.assignedAt = new Date();
          updateData.assignedBy = session.userId;
          
          // Update status to pending_selection when domain is assigned (if currently draft)
          if (current.status === 'draft') {
            updateData.status = 'pending_selection';
            changes.status = { 
              from: current.status, 
              to: 'pending_selection' 
            };
          }
          
          changes.domain = { 
            from: current.assignedDomain, 
            to: update.assignedDomain 
          };
        }

        if (update.clientReviewStatus !== undefined) {
          updateData.clientReviewStatus = update.clientReviewStatus;
          updateData.clientReviewedAt = new Date();
          updateData.clientReviewNotes = update.clientReviewNotes;
          
          // Lock price on approval
          if (update.clientReviewStatus === 'approved' && !current.approvedPrice) {
            updateData.approvedPrice = update.approvedPrice || current.estimatedPrice;
          }
          
          changes.clientReview = {
            from: current.clientReviewStatus,
            to: update.clientReviewStatus
          };
        }

        // Handle price updates
        if (update.estimatedPrice !== undefined && update.estimatedPrice !== current.estimatedPrice) {
          updateData.estimatedPrice = update.estimatedPrice;
          changes.estimatedPrice = { from: current.estimatedPrice, to: update.estimatedPrice };
        }

        if (update.wholesalePrice !== undefined && update.wholesalePrice !== current.wholesalePrice) {
          updateData.wholesalePrice = update.wholesalePrice;
          changes.wholesalePrice = { from: current.wholesalePrice, to: update.wholesalePrice };
        }

        if (update.approvedPrice !== undefined && update.approvedPrice !== current.approvedPrice) {
          updateData.approvedPrice = update.approvedPrice;
          changes.approvedPrice = { from: current.approvedPrice, to: update.approvedPrice };
        }

        // Handle metadata updates (merge with existing)
        if (update.metadata !== undefined) {
          updateData.metadata = {
            ...(current.metadata || {}),
            ...update.metadata
          };
          changes.metadata = { 
            from: current.metadata, 
            to: updateData.metadata 
          };
        }

        // Only update if there are changes
        if (Object.keys(changes).length > 0) {
          const [updatedItem] = await tx.update(orderLineItems)
            .set(updateData)
            .where(and(
              eq(orderLineItems.id, update.id),
              eq(orderLineItems.version, current.version) // Optimistic locking
            ))
            .returning();

          if (!updatedItem) {
            throw new Error(`Concurrent update detected for line item ${update.id}`);
          }

          updated.push(updatedItem);

          // Create change log entry
          await tx.insert(lineItemChanges).values({
            lineItemId: update.id,
            orderId,
            changeType: Object.keys(changes).includes('status') ? 'status_changed' : 'modified',
            previousValue: changes,
            newValue: updateData,
            changedBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
            changeReason: reason || update.reason || 'Line item updated',
            batchId
          });
        }
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `${updatedItems.length} line items updated`,
      lineItems: updatedItems
    });

  } catch (error: any) {
    console.error('Error updating line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update line items' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]/line-items
 * Cancel/remove line items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds, reason } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ 
        error: 'itemIds array is required' 
      }, { status: 400 });
    }

    // Get the order
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
        error: 'Cannot delete line items from this order' 
      }, { status: 403 });
    }

    // For account users, check if order is still editable (before payment phase)
    if (session.userType === 'account') {
      const editableStatuses = [
        'draft',                  // Creating order
        'pending_confirmation',   // Submitted but not confirmed
        'confirmed',             // Internal confirmed, analyzing
        'sites_ready',           // Sites selected for review
        'client_reviewing',      // Client reviewing sites
        'client_approved',       // Client approved sites
        'invoiced'               // Invoice sent but not paid - user can still edit
      ];
      
      const paymentLockedStatuses = [
        'payment_pending',       // Payment intent created - payment in process
        'payment_processing',    // Payment being processed
        'paid',                  // Payment received - LOCK HERE
        'in_progress',           // Work started
        'completed',             // Order completed
        'refunded',              // Refunded
        'partially_refunded'     // Partially refunded
      ];

      if (!editableStatuses.includes(order.status)) {
        if (paymentLockedStatuses.includes(order.status)) {
          return NextResponse.json({ 
            error: `Cannot delete line items once payment process begins. Current status: '${order.status}'. Please contact support for assistance.` 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          error: `Cannot delete line items in status: '${order.status}'` 
        }, { status: 400 });
      }
    }

    // Cancel line items (soft delete)
    const cancelledItems = await db.transaction(async (tx) => {
      const batchId = crypto.randomUUID();
      const cancelled = [];

      for (const itemId of itemIds) {
        const [cancelledItem] = await tx.update(orderLineItems)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: session.userId,
            cancellationReason: reason || 'Line item cancelled',
            modifiedAt: new Date(),
            modifiedBy: session.userId
          })
          .where(and(
            eq(orderLineItems.id, itemId),
            eq(orderLineItems.orderId, orderId)
          ))
          .returning();

        if (cancelledItem) {
          cancelled.push(cancelledItem);

          // Create change log entry
          await tx.insert(lineItemChanges).values({
            lineItemId: itemId,
            orderId,
            changeType: 'cancelled',
            previousValue: { status: cancelledItem.status },
            newValue: { status: 'cancelled' },
            changedBy: session.userType === 'account' ? '00000000-0000-0000-0000-000000000000' : session.userId,
            changeReason: reason || 'Line item cancelled',
            batchId
          });
        }
      }

      return cancelled;
    });

    return NextResponse.json({
      success: true,
      message: `${cancelledItems.length} line items cancelled`,
      lineItems: cancelledItems
    });

  } catch (error: any) {
    console.error('Error cancelling line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel line items' },
      { status: 500 }
    );
  }
}