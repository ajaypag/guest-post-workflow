import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lineItemId: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lineItemId } = await params;
    const body = await request.json();
    const { status, publishedUrl, notes } = body;

    // Verify the order belongs to this publisher
    const lineItem = await db
      .select()
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.id, lineItemId),
          eq(orderLineItems.publisherId, session.publisherId)
        )
      )
      .limit(1);

    if (!lineItem[0]) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = lineItem[0].publisherStatus;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'accepted': ['in_progress'],
      'in_progress': ['submitted'],
      'submitted': [], // Only internal team can move from submitted
      'completed': [], // Final state
      'rejected': []   // Final state
    };

    if (!validTransitions[currentStatus || '']?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      publisherStatus: status,
      modifiedAt: new Date()
    };

    // Add specific fields based on status
    if (status === 'submitted') {
      if (!publishedUrl) {
        return NextResponse.json(
          { error: 'Published URL is required for submission' },
          { status: 400 }
        );
      }
      updateData.publisherSubmittedAt = new Date();
      updateData.publishedUrl = publishedUrl;
      updateData.deliveredAt = new Date();
      if (notes) {
        updateData.deliveryNotes = notes;
      }
    }

    // Update the line item
    const updatedLineItem = await db
      .update(orderLineItems)
      .set(updateData)
      .where(eq(orderLineItems.id, lineItemId))
      .returning();

    // Create earnings record if work is submitted
    if (status === 'submitted' && lineItem[0].publisherPrice) {
      try {
        const netAmount = lineItem[0].publisherPrice - (lineItem[0].platformFee || 0);
        
        await db.execute(sql`
          INSERT INTO publisher_earnings (
            id, publisher_id, order_line_item_id, order_id,
            gross_amount, platform_fee, net_amount, status, earned_date,
            description, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), ${session.publisherId}, ${lineItemId}, ${lineItem[0].orderId},
            ${lineItem[0].publisherPrice}, ${lineItem[0].platformFee || 0}, ${netAmount}, 'pending', CURRENT_DATE,
            ${`Work completed for ${lineItem[0].assignedDomain} - "${lineItem[0].anchorText}"`}, NOW(), NOW()
          )
        `);
      } catch (earningsError) {
        console.error('Failed to create earnings record:', earningsError);
        // Don't fail the status update if earnings creation fails
      }
    }

    return NextResponse.json({
      success: true,
      lineItem: updatedLineItem[0],
      message: `Order status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}