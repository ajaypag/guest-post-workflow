import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
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
    const { reason } = body;

    // Verify the order belongs to this publisher and is in correct state
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

    if (!['pending', 'notified'].includes(lineItem[0].publisherStatus || '')) {
      return NextResponse.json(
        { error: `Cannot reject order in status: ${lineItem[0].publisherStatus}` },
        { status: 400 }
      );
    }

    // Update the line item status to rejected
    const updatedLineItem = await db
      .update(orderLineItems)
      .set({
        publisherStatus: 'rejected',
        // Store rejection reason in metadata
        metadata: {
          ...lineItem[0].metadata as any,
          rejectionReason: reason,
          rejectedAt: new Date().toISOString()
        }
      })
      .where(eq(orderLineItems.id, lineItemId))
      .returning();

    return NextResponse.json({
      success: true,
      lineItem: updatedLineItem[0],
      message: 'Order rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting order:', error);
    return NextResponse.json(
      { error: 'Failed to reject order' },
      { status: 500 }
    );
  }
}