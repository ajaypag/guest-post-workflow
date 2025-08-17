import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { publishers } from '@/lib/db/schema';
import { publisherEarnings } from '@/lib/db/publisherEarningsSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { PublisherNotificationService } from '@/lib/services/publisherNotificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: lineItemId } = await params;
    const body = await request.json();
    const { 
      publisherId, 
      publisherPrice, 
      platformFee,
      publisherOfferingId,
      autoNotify = true 
    } = body;

    // Validate the line item exists
    const lineItem = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItemId))
      .limit(1);

    if (!lineItem[0]) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // If publisherId is provided, validate the publisher exists
    if (publisherId) {
      const publisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, publisherId))
        .limit(1);

      if (!publisher[0]) {
        return NextResponse.json(
          { error: 'Publisher not found' },
          { status: 404 }
        );
      }

      if (publisher[0].status !== 'active') {
        return NextResponse.json(
          { error: 'Publisher is not active' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      publisherId: publisherId || null,
      publisherOfferingId: publisherOfferingId || null,
      publisherPrice: publisherPrice || null,
      platformFee: platformFee || null,
      modifiedAt: new Date(),
      modifiedBy: session.userId
    };

    // Set publisher status based on assignment
    if (publisherId) {
      updateData.publisherStatus = autoNotify ? 'notified' : 'pending';
      if (autoNotify) {
        updateData.publisherNotifiedAt = new Date();
      }
    } else {
      // Removing publisher assignment
      updateData.publisherStatus = null;
      updateData.publisherNotifiedAt = null;
      updateData.publisherAcceptedAt = null;
      updateData.publisherSubmittedAt = null;
    }

    // Update the line item
    const updatedLineItem = await db
      .update(orderLineItems)
      .set(updateData)
      .where(eq(orderLineItems.id, lineItemId))
      .returning();

    // If removing publisher, also remove any pending earnings
    if (!publisherId) {
      await db
        .delete(publisherEarnings)
        .where(
          and(
            eq(publisherEarnings.orderLineItemId, lineItemId),
            eq(publisherEarnings.status, 'pending')
          )
        );
    }

    // Send notification to publisher if autoNotify is true
    let notificationResult = null;
    if (publisherId && autoNotify) {
      try {
        notificationResult = await PublisherNotificationService.notifyPublisherAssignment(
          lineItemId, 
          publisherId
        );
      } catch (error) {
        console.error('Failed to send publisher notification:', error);
        // Don't fail the assignment if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      lineItem: updatedLineItem[0],
      notificationSent: notificationResult?.success || false,
      message: publisherId 
        ? `Publisher assigned${autoNotify && notificationResult?.success ? ' and notified' : ''}`
        : 'Publisher assignment removed'
    });

  } catch (error) {
    console.error('Error assigning publisher:', error);
    return NextResponse.json(
      { error: 'Failed to assign publisher' },
      { status: 500 }
    );
  }
}