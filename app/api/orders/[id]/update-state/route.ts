import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { EmailService } from '@/lib/services/emailService';
import { SitesReadyForReviewEmail } from '@/lib/email/templates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal users can update order state
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Forbidden - Only internal users can update order state' }, { status: 403 });
    }

    const { id } = await params;
    const { state } = await request.json();

    // Validate the state value
    const validStates = [
      'analyzing',
      'sites_ready',
      'client_reviewing',
      'selections_confirmed',
      'payment_received',
      'workflows_generated',
      'in_progress'
    ];

    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ 
        error: `Invalid state. Valid states are: ${validStates.join(', ')}` 
      }, { status: 400 });
    }

    // First fetch the order to check it exists
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Track state changes for notification purposes
    const stateChangeMetadata: any = {
      previousState: existingOrder.state,
      newState: state,
      changedBy: session.userId,
      changedAt: new Date().toISOString()
    };

    // If marking sites ready, add notification flag
    if (state === 'sites_ready') {
      stateChangeMetadata.notifyAccount = true;
      stateChangeMetadata.notificationMessage = 'Sites are ready for your review';
    }

    // Update the order state
    await db
      .update(orders)
      .set({
        state,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id));

    // Fetch the updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        account: true
      },
    });

    // Send notification email if sites are ready
    if (state === 'sites_ready' && updatedOrder?.account?.email) {
      try {
        console.log(`[STATE_UPDATE] Sending sites ready email to ${updatedOrder.account.email} for order ${id}`);
        
        // Fetch the order items (sites) for this order - using the CORRECT table with AI data!
        const orderItems = await db.query.orderLineItems.findMany({
          where: eq(orderLineItems.orderId, id),
        });

        // Format sites for email template with AI qualification data
        const sites = orderItems.map(item => {
          const metadata = item.metadata as any || {};
          return {
            domain: item.assignedDomain || 'Domain pending',
            domainRating: metadata.domainRating || 0,
            traffic: metadata.traffic || 0,
            price: `$${((item.approvedPrice || item.estimatedPrice || 0) / 100).toFixed(2)}`,
            niche: metadata.topicScope || undefined,
            qualificationStatus: metadata.domainQualificationStatus,
            authorityDirect: metadata.authorityDirect,
            authorityRelated: metadata.authorityRelated,
            overlapStatus: metadata.overlapStatus,
            aiReasoning: metadata.aiQualificationReasoning,
          };
        });

        // Calculate total amount
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.approvedPrice || item.estimatedPrice || 0), 0);
        const formattedTotal = `$${(totalAmount / 100).toFixed(2)}`;

        // Generate review URL
        const reviewUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${id}`;
        
        // Get account manager info from session
        const accountManagerName = session.name || 'Your Account Manager';
        const accountManagerEmail = session.email || 'info@linkio.com';

        // Calculate estimated completion date (14 days from now)
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + 14);
        const estimatedCompletionDate = estimatedDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        // Send the email
        const emailResult = await EmailService.sendWithTemplate(
          'notification',
          updatedOrder.account.email,
          {
            subject: `${sites.length} Sites Ready for Your Review - Order #${id.substring(0, 8).toUpperCase()}`,
            template: SitesReadyForReviewEmail({
              recipientName: updatedOrder.account.contactName || 'there',
              companyName: updatedOrder.account.companyName,
              orderNumber: id,
              sitesCount: sites.length,
              totalAmount: formattedTotal,
              sites,
              reviewUrl,
              estimatedCompletionDate,
              accountManagerName,
              accountManagerEmail,
            }),
          }
        );

        if (emailResult.success) {
          console.log(`[STATE_UPDATE] Email sent successfully to ${updatedOrder.account.email}`);
          
          // Optionally update order with notification timestamp
          await db
            .update(orders)
            .set({
              clientNotifiedAt: new Date()
            })
            .where(eq(orders.id, id));
        } else {
          console.error('[STATE_UPDATE] Email failed:', emailResult.error);
        }
      } catch (error) {
        console.error('Failed to send notification email:', error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order state:', error);
    return NextResponse.json(
      { error: 'Failed to update order state' },
      { status: 500 }
    );
  }
}