import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders, orderGroups, orderSiteSelections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Verify the order exists and belongs to this user
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.createdBy, session.userId),
          eq(orders.status, 'draft')
        )
      );

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
    if (orderData.groups && orderData.groups.length > 0) {
      // Delete existing groups for this order
      await db.delete(orderGroups).where(eq(orderGroups.orderId, orderId));

      // Insert new groups
      for (const group of orderData.groups) {
        const [insertedGroup] = await db.insert(orderGroups).values({
          orderId: orderId,
          clientId: group.clientId,
          linkCount: group.linkCount,
          targetPages: group.selections.map((sel: any) => ({ 
            url: sel.targetPageUrl || '', 
            pageId: sel.targetPageId 
          })),
          anchorTexts: group.selections.map((sel: any) => sel.anchorText || ''),
        }).returning();

        // Insert site selections
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

    // Delete only if it's a draft and belongs to this user
    await db
      .delete(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.createdBy, session.userId),
          eq(orders.status, 'draft')
        )
      );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting draft order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}