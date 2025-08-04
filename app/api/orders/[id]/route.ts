import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/orderSchema';
import { orderGroups, orderSiteSelections } from '@/lib/db/orderGroupSchema';
import { clients, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { orderSiteSubmissions, projectOrderAssociations } from '@/lib/db/projectOrderAssociationsSchema';

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
    
    // Transform the data
    const orderWithGroups = {
      ...order,
      orderGroups: groupsWithSelections
    };

    console.log('GET /api/orders/[id] - Returning order data:', {
      orderId: id,
      status: orderWithGroups.status,
      orderGroupsCount: groupsWithSelections?.length || 0,
      orderGroupsPreview: groupsWithSelections?.map(g => ({
        id: g.id,
        clientName: g.client?.name,
        linkCount: g.linkCount,  
        targetPagesCount: g.targetPages?.length || 0
      }))
    });

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
      // Orders are editable up until payment is received
      const editableStatuses = [
        'draft',                  // Creating order
        'pending_confirmation',   // Submitted but not confirmed
        'confirmed',             // Internal confirmed, analyzing
        'sites_ready',           // Sites selected for review
        'client_reviewing',      // Client reviewing sites
        'client_approved',       // Client approved sites
        'invoiced'              // Invoice sent but not paid
      ];
      
      if (!editableStatuses.includes(existingOrder.status)) {
        return NextResponse.json({ 
          error: `Orders cannot be edited after payment. Current status: '${existingOrder.status}'` 
        }, { status: 400 });
      }
    } else if (session.userType !== 'internal') {
      // Only internal users and account owners can update orders
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Start a transaction to update order and groups
    await db.transaction(async (tx) => {
      // Update the order fields (excluding orderGroups and status)
      const { orderGroups: newOrderGroups, status, ...orderData } = data;
      
      console.log('PUT /api/orders/[id] - Received data:', { 
        orderId: id, 
        hasStatus: 'status' in data, 
        statusValue: status,
        existingStatus: existingOrder.status,
        hasOrderGroups: 'orderGroups' in data,
        orderGroupsCount: newOrderGroups ? newOrderGroups.length : 0,
        orderGroupsData: newOrderGroups
      });
      
      await tx
        .update(orders)
        .set({
          ...orderData,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      
      // If orderGroups are provided, update them
      if (newOrderGroups && Array.isArray(newOrderGroups)) {
        console.log('DELETING existing order groups for orderId:', id);
        // Delete existing order groups
        await tx.delete(orderGroups).where(eq(orderGroups.orderId, id));
        
        console.log('INSERTING new order groups:', newOrderGroups.length, 'groups');
        // Insert new order groups
        for (const group of newOrderGroups) {
          const groupId = crypto.randomUUID();
          const insertData = {
            id: groupId,
            orderId: id,
            clientId: group.clientId,
            linkCount: group.linkCount || 1,
            targetPages: group.targetPages || [],
            anchorTexts: group.anchorTexts || [],
            requirementOverrides: {
              ...(group.requirementOverrides || {}),
              packageType: group.packageType,
              packagePrice: group.packagePrice
            },
            groupStatus: group.groupStatus || 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('INSERTING order group:', {
            groupId,
            clientId: group.clientId,
            clientName: group.clientName,
            linkCount: group.linkCount,
            targetPagesCount: group.targetPages?.length || 0
          });
          
          await tx.insert(orderGroups).values(insertData);
        }
        console.log('COMPLETED inserting order groups');
      } else {
        console.log('NO order groups to insert - newOrderGroups:', newOrderGroups);
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
    
    // Transform the data
    const orderWithGroups = {
      ...updatedOrder,
      orderGroups: groupsWithSelections
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