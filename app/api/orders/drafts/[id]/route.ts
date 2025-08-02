import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderGroups } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch a draft order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Fetch the order with groups based on user type
    let order;
    if (session.userType === 'internal') {
      // Internal users can access drafts they created
      [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.createdBy, session.userId),
            eq(orders.status, 'draft')
          )
        );
    } else if (session.userType === 'account') {
      // Account users can access drafts for their account
      [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.accountId, session.userId), // session.userId is accountId for account users
            eq(orders.status, 'draft')
          )
        );
    }

    if (!order) {
      return NextResponse.json({ error: 'Draft order not found' }, { status: 404 });
    }

    // Fetch order groups
    const groups = await db
      .select()
      .from(orderGroups)
      .where(eq(orderGroups.orderId, orderId));

    // Format the response to match the expected structure
    const formattedOrder = {
      ...order,
      groups: groups.map(group => ({
        clientId: group.clientId,
        linkCount: group.linkCount,
        selections: (group.targetPages || []).map((page: any, index: number) => ({
          targetPageUrl: page.url || '',
          targetPageId: page.pageId || '',
          anchorText: group.anchorTexts?.[index] || ''
        }))
      }))
    };

    return NextResponse.json({ order: formattedOrder });

  } catch (error) {
    console.error('Error fetching draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a draft order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { orderData } = await request.json();

    // Verify the order exists and user has access
    let existingOrder;
    if (session.userType === 'internal') {
      // Internal users can access drafts they created
      [existingOrder] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.createdBy, session.userId),
            eq(orders.status, 'draft')
          )
        );
    } else if (session.userType === 'account') {
      // Account users can access drafts for their account
      [existingOrder] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.accountId, session.userId), // session.userId is accountId for account users
            eq(orders.status, 'draft')
          )
        );
    }

    if (!existingOrder) {
      return NextResponse.json({ error: 'Draft order not found' }, { status: 404 });
    }

    // Update the order
    await db
      .update(orders)
      .set({
        accountEmail: orderData.accountEmail,
        accountName: orderData.accountName,
        accountCompany: orderData.accountCompany,
        
        // Pricing
        subtotalRetail: orderData.subtotalRetail || 0,
        discountPercent: orderData.discountPercent || '0',
        discountAmount: orderData.discountAmount || 0,
        totalRetail: orderData.totalRetail || 0,
        totalWholesale: orderData.totalWholesale || 0,
        profitMargin: orderData.profitMargin || 0,
        
        // Optional services
        includesClientReview: orderData.includesClientReview || false,
        clientReviewFee: orderData.clientReviewFee || 0,
        rushDelivery: orderData.rushDelivery || false,
        rushFee: orderData.rushFee || 0,
        
        // Notes
        accountNotes: orderData.accountNotes,
        
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Handle order groups if present
    if (orderData.orderGroups && orderData.orderGroups.length > 0) {
      // Delete existing groups for this order
      await db.delete(orderGroups).where(eq(orderGroups.orderId, orderId));

      // Insert new groups
      for (const group of orderData.orderGroups) {
        const [insertedGroup] = await db.insert(orderGroups).values({
          orderId: orderId,
          clientId: group.clientId,
          linkCount: group.linkCount,
          targetPages: group.targetPages || [],
          anchorTexts: group.anchorTexts || [],
          requirementOverrides: {},
          groupStatus: 'pending'
        }).returning();

        // Insert site selections
        // TODO: Site selection happens later in the process, not at draft stage
        // Commenting out until proper domain selection is implemented
        /*
        if (group.selections && group.selections.length > 0) {
          const selectionsToInsert = group.selections.map((selection: any) => ({
            orderGroupId: insertedGroup.id,
            domainId: selection.domainId || crypto.randomUUID(), // Temporary until domain selection is implemented
            targetPageId: selection.targetPageId,
            domain: selection.domain || 'placeholder.com', // Temporary
            domainRating: selection.domainRating,
            traffic: selection.traffic,
            retailPrice: selection.retailPrice,
            wholesalePrice: selection.wholesalePrice,
          }));

          await db.insert(orderSiteSelections).values(selectionsToInsert);
        }
        */
      }
    }

    return NextResponse.json({ 
      success: true,
      orderId: orderId
    });

  } catch (error) {
    console.error('Error updating draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a draft order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Delete only if it's a draft and user has access
    if (session.userType === 'internal') {
      // Internal users can delete drafts they created
      await db
        .delete(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.createdBy, session.userId),
            eq(orders.status, 'draft')
          )
        );
    } else if (session.userType === 'account') {
      // Account users can delete drafts for their account
      await db
        .delete(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.accountId, session.userId), // session.userId is accountId for account users
            eq(orders.status, 'draft')
          )
        );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}