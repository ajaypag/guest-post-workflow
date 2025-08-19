import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { orderGroups, orderSiteSelections } from '@/lib/db/orderGroupSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { clients, users, publishers } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { orderSiteSubmissions, projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the order with relationships
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true,
        items: true
      },
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Manually fetch orderGroups
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, id));
    
    // Fetch site selections for each group
    const groupsWithSelections = await Promise.all(
      orderGroupsData.map(async ({ orderGroup, client }) => {
        // Count site selections
        const siteSelections = await db.query.orderSiteSelections.findMany({
          where: eq(orderSiteSelections.orderGroupId, orderGroup.id)
        });
        
        return {
          id: orderGroup.id,
          orderId: orderGroup.orderId,
          clientId: orderGroup.clientId,
          linkCount: orderGroup.linkCount,
          targetPages: orderGroup.targetPages,
          anchorTexts: orderGroup.anchorTexts,
          requirementOverrides: orderGroup.requirementOverrides,
          groupStatus: orderGroup.groupStatus,
          bulkAnalysisProjectId: orderGroup.bulkAnalysisProjectId,
          createdAt: orderGroup.createdAt,
          updatedAt: orderGroup.updatedAt,
          client,
          // Extract packageType and packagePrice from requirementOverrides
          packageType: orderGroup.requirementOverrides?.packageType || 'better',
          packagePrice: orderGroup.requirementOverrides?.packagePrice || 0,
          // Add site selection counts
          siteSelections: {
            approved: siteSelections.filter(s => s.status === 'approved').length,
            pending: siteSelections.filter(s => s.status === 'suggested').length,
            total: siteSelections.length
          }
        };
      })
    );
    
    // Load line items if the system is enabled
    let lineItems: any[] = [];
    if (isLineItemsSystemEnabled()) {
      try {
        lineItems = await db.query.orderLineItems.findMany({
          where: eq(orderLineItems.orderId, id),
          with: {
            client: {
              columns: {
                id: true,
                name: true,
                website: true
              }
            },
            targetPage: true,
            assignedDomain: true,
            addedByUser: {
              columns: {
                id: true,
                email: true,
                name: true
              }
            }
          },
          orderBy: [
            orderLineItems.displayOrder,
            orderLineItems.addedAt
          ]
        });

        // Fetch publisher data separately and merge it
        const lineItemsWithPublishers = await Promise.all(
          lineItems.map(async (item) => {
            let publisher = null;
            if (item.publisherId) {
              try {
                const publisherData = await db.query.publishers.findFirst({
                  where: eq(publishers.id, item.publisherId),
                  columns: {
                    id: true,
                    contactName: true,
                    companyName: true,
                    email: true
                  }
                });
                publisher = publisherData || null;
              } catch (error) {
                console.error('Error fetching publisher:', error);
              }
            }
            
            return {
              ...item,
              publisher
            };
          })
        );

        lineItems = lineItemsWithPublishers;
      } catch (error) {
        console.error('Error loading line items:', error);
        // Continue without line items if there's an error
      }
    }
    
    // Transform the data
    const orderWithGroups = {
      ...order,
      orderGroups: groupsWithSelections,
      lineItems: lineItems
    };

    // Check permissions
    if (session.userType === 'account') {
      // Accounts can only see their own orders
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and accounts can view orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(orderWithGroups);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    
    // First fetch the order to check ownership
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check permissions
    if (session.userType === 'account') {
      // Account users can only update their own orders
      if (existingOrder.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Define which statuses allow editing by account users
      // Orders are editable until payment is ACTUALLY received (not just invoiced)
      const editableStatuses = [
        'draft',                  // Creating order
        'pending_confirmation',   // Submitted but not confirmed
        'confirmed',             // Internal confirmed, analyzing
        'sites_ready',           // Sites selected for review
        'client_reviewing',      // Client reviewing sites
        'client_approved',       // Client approved sites
        'invoiced'               // Invoice sent but not paid - user can still edit
      ];
      
      // Check for payment-related states that should never be editable by accounts
      const paymentLockedStatuses = [
        'payment_pending',       // Payment intent created - payment in process
        'payment_processing',    // Payment being processed
        'paid',                  // Payment received - LOCK HERE
        'in_progress',           // Work started
        'completed',             // Order completed
        'refunded',              // Refunded
        'partially_refunded'     // Partially refunded
      ];
      
      if (!editableStatuses.includes(existingOrder.status)) {
        if (paymentLockedStatuses.includes(existingOrder.status)) {
          return NextResponse.json({ 
            error: `Orders are locked for editing once payment process begins. Current status: '${existingOrder.status}'. Please contact support if changes are needed.` 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          error: `Orders cannot be edited in status: '${existingOrder.status}'` 
        }, { status: 400 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and account owners can update orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For internal users, add audit logging for admin overrides
    if (session.userType === 'internal') {
      // Get user details for audit
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId)
      });
      
      if (user) {
        const isPostPaymentEdit = ['invoiced', 'payment_pending', 'payment_processing', 'paid', 'in_progress', 'completed', 'refunded', 'partially_refunded'].includes(existingOrder.status);
        const isAdminOverride = user.role === 'admin' && isPostPaymentEdit;
        
        // Log significant admin actions for audit trail
        if (isAdminOverride || user.role === 'admin') {
          console.log(`ADMIN EDIT: User ${user.email} (${user.id}) editing order ${id}`);
          console.log(`Order Status: ${existingOrder.status} -> Admin Override: ${isAdminOverride}`);
          console.log(`Account: ${existingOrder.accountId}, Changes: ${Object.keys(data).join(', ')}`);
          
          // In a production system, this should go to a proper audit table
          // For now, console logging provides the audit trail needed
        }
      }
    }

    // Start a transaction to update order and groups
    await db.transaction(async (tx) => {
      // Update the order fields (excluding orderGroups)
      const { orderGroups: newOrderGroups, ...orderData } = data;
      
      await tx
        .update(orders)
        .set({
          ...orderData,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      
      // If orderGroups are provided, convert them to line items (phasing out order groups)
      if (newOrderGroups && Array.isArray(newOrderGroups) && isLineItemsSystemEnabled()) {
        // Delete existing line items for this order first
        await tx.delete(orderLineItems).where(eq(orderLineItems.orderId, id));
        
        let displayOrder = 0;
        
        // Create line items from order groups data (no longer creating order groups)
        for (const group of newOrderGroups) {
          const targetPages = group.targetPages || [];
          const anchorTexts = group.anchorTexts || [];
          const linkCount = group.linkCount || 1;
          
          // Create one line item per target page/link
          for (let i = 0; i < linkCount; i++) {
            const targetPage = targetPages[i];
            const anchorText = anchorTexts[i];
            
            // Calculate estimated price (use packagePrice if available, otherwise default)
            const estimatedPrice = group.packagePrice || 29900; // Default $299
            
            // Create line item using same pattern as orders/route.ts
            const lineItemId = crypto.randomUUID();
            const lineItemData = {
              orderId: id,
              clientId: group.clientId,
              addedBy: session.userId,
              status: 'draft' as const,
              estimatedPrice: estimatedPrice,
              displayOrder: displayOrder,
              ...(targetPage?.url ? { targetPageUrl: targetPage.url } : {}),
              ...(targetPage?.pageId ? { targetPageId: targetPage.pageId } : {}),
              ...(anchorText ? { anchorText: anchorText } : {})
            };
            
            await tx.insert(orderLineItems).values(lineItemData);
            
            // Create change log entry
            await tx.insert(lineItemChanges).values({
              lineItemId: lineItemId,
              orderId: id,
              changeType: 'created',
              newValue: {
                targetPageUrl: targetPage?.url,
                anchorText: anchorText,
                estimatedPrice: estimatedPrice,
                source: 'order_edit_page_migration'
              },
              changedBy: session.userId,
              changeReason: 'Line item created during order groups to line items migration'
            });
            
            displayOrder++;
          }
        }
        
        // Clean up any existing order groups since we're migrating away from them
        await tx.delete(orderGroups).where(eq(orderGroups.orderId, id));
      }
    });

    // Fetch the updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true,
        items: true
      },
    });
    
    // Manually fetch orderGroups
    const orderGroupsData = await db
      .select({
        orderGroup: orderGroups,
        client: clients
      })
      .from(orderGroups)
      .leftJoin(clients, eq(orderGroups.clientId, clients.id))
      .where(eq(orderGroups.orderId, id));
    
    // Fetch site selections for each group
    const groupsWithSelections = await Promise.all(
      orderGroupsData.map(async ({ orderGroup, client }) => {
        // Count site selections
        const siteSelections = await db.query.orderSiteSelections.findMany({
          where: eq(orderSiteSelections.orderGroupId, orderGroup.id)
        });
        
        return {
          id: orderGroup.id,
          orderId: orderGroup.orderId,
          clientId: orderGroup.clientId,
          linkCount: orderGroup.linkCount,
          targetPages: orderGroup.targetPages,
          anchorTexts: orderGroup.anchorTexts,
          requirementOverrides: orderGroup.requirementOverrides,
          groupStatus: orderGroup.groupStatus,
          bulkAnalysisProjectId: orderGroup.bulkAnalysisProjectId,
          createdAt: orderGroup.createdAt,
          updatedAt: orderGroup.updatedAt,
          client,
          // Extract packageType and packagePrice from requirementOverrides
          packageType: orderGroup.requirementOverrides?.packageType || 'better',
          packagePrice: orderGroup.requirementOverrides?.packagePrice || 0,
          // Add site selection counts
          siteSelections: {
            approved: siteSelections.filter(s => s.status === 'approved').length,
            pending: siteSelections.filter(s => s.status === 'suggested').length,
            total: siteSelections.length
          }
        };
      })
    );
    
    // Load line items if the system is enabled (for PUT response)
    let lineItems: any[] = [];
    if (isLineItemsSystemEnabled()) {
      try {
        lineItems = await db.query.orderLineItems.findMany({
          where: eq(orderLineItems.orderId, id),
          with: {
            client: {
              columns: {
                id: true,
                name: true,
                website: true
              }
            },
            targetPage: true,
            assignedDomain: true,
            addedByUser: {
              columns: {
                id: true,
                email: true,
                name: true
              }
            }
          },
          orderBy: [
            orderLineItems.displayOrder,
            orderLineItems.addedAt
          ]
        });

        // Fetch publisher data separately and merge it
        const lineItemsWithPublishers = await Promise.all(
          lineItems.map(async (item) => {
            let publisher = null;
            if (item.publisherId) {
              try {
                const publisherData = await db.query.publishers.findFirst({
                  where: eq(publishers.id, item.publisherId),
                  columns: {
                    id: true,
                    contactName: true,
                    companyName: true,
                    email: true
                  }
                });
                publisher = publisherData || null;
              } catch (error) {
                console.error('Error fetching publisher:', error);
              }
            }
            
            return {
              ...item,
              publisher
            };
          })
        );

        lineItems = lineItemsWithPublishers;
      } catch (error) {
        console.error('Error loading line items (PUT):', error);
      }
    }
    
    // Transform the data
    const orderWithGroups = {
      ...updatedOrder,
      orderGroups: groupsWithSelections,
      lineItems: lineItems
    };

    return NextResponse.json(orderWithGroups);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // First, fetch the order to check ownership
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    // Separately fetch order groups for cascade deletion
    const orderGroupsData = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, id),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account') {
      // Account users can only delete their own draft orders
      if (order.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Only allow deletion of draft orders
      if (order.status !== 'draft') {
        return NextResponse.json({ 
          error: 'Only draft orders can be deleted' 
        }, { status: 400 });
      }
    } else if (session.userType === 'internal') {
      // Internal users need admin role to delete non-draft orders
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId)
      });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Only admins can delete non-draft orders
      if (order.status !== 'draft' && user.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Only admin users can delete non-draft orders' 
        }, { status: 403 });
      }
      
      // Log admin deletion for audit trail
      if (user.role === 'admin' && order.status !== 'draft') {
        console.log(`ADMIN DELETE: User ${user.email} (${user.id}) deleting ${order.status} order ${id}`);
        console.log(`Order details: Account ID: ${order.accountId}, Total: ${order.totalRetail}, Created: ${order.createdAt}`);
      }
    } else {
      // Other user types cannot delete orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Use transaction to ensure all related data is deleted properly
    await db.transaction(async (tx) => {
      // Delete related data that might not have cascade delete set up properly
      
      // 1. Delete order site submissions (if any)
      if (orderGroupsData.length > 0) {
        const orderGroupIds = orderGroupsData.map(g => g.id);
        await tx.delete(orderSiteSubmissions)
          .where(inArray(orderSiteSubmissions.orderGroupId, orderGroupIds));
      }
      
      // 2. Delete order site selections (if any)
      if (orderGroupsData.length > 0) {
        const orderGroupIds = orderGroupsData.map(g => g.id);
        await tx.delete(orderSiteSelections)
          .where(inArray(orderSiteSelections.orderGroupId, orderGroupIds));
      }
      
      // 3. Delete project-order associations
      await tx.delete(projectOrderAssociations)
        .where(eq(projectOrderAssociations.orderId, id));
      
      // 4. Delete order items (should cascade, but being explicit)
      await tx.delete(orderItems)
        .where(eq(orderItems.orderId, id));
      
      // 5. Delete order groups (should cascade, but being explicit)
      await tx.delete(orderGroups)
        .where(eq(orderGroups.orderId, id));
      
      // 6. Finally, delete the order itself
      await tx.delete(orders)
        .where(eq(orders.id, id));
      
      // Note: We're NOT deleting bulk analysis projects as they might be 
      // associated with other orders or be useful for historical reference
    });

    return NextResponse.json({ 
      success: true,
      deletedOrder: {
        id: order.id,
        status: order.status,
        accountId: order.accountId,
        totalRetail: order.totalRetail
      }
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}