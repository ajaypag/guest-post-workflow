import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripeService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { stripeCheckoutSessions } from '@/lib/db/paymentSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const verifyPaymentSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Authenticate the request
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userType, userId } = session;
    const accountId = userType === 'account' ? userId : session.accountId;

    // Parse and validate request body
    const body = await request.json();
    const { sessionId } = verifyPaymentSessionSchema.parse(body);

    // Verify order ownership
    let orderQuery;
    if (userType === 'account') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Account ID required' },
          { status: 400 }
        );
      }
      
      orderQuery = db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.accountId, userId)
          )
        );
    } else {
      // Internal user - can access any order
      orderQuery = db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
    }

    const orderResult = await orderQuery.limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    const order = orderResult[0];

    // Retrieve the checkout session from Stripe and our database
    const { session: stripeSession, dbSession } = await StripeService.retrieveCheckoutSession(sessionId);

    // Verify the session belongs to this order
    if (!dbSession || dbSession.orderId !== orderId) {
      return NextResponse.json(
        { error: 'Session does not belong to this order' },
        { status: 400 }
      );
    }

    console.log('[VERIFY PAYMENT] Session verification:', {
      sessionId,
      orderId,
      sessionStatus: stripeSession.status,
      paymentStatus: stripeSession.payment_status,
      orderState: order.state
    });

    // Update our database with the latest session status if needed
    if (stripeSession.status !== dbSession.status) {
      await StripeService.updateCheckoutSessionFromWebhook(
        sessionId,
        stripeSession,
        'manual_verification'
      );
      
      // Refresh order state
      const updatedOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (updatedOrder.length > 0) {
        order.state = updatedOrder[0].state;
        order.paidAt = updatedOrder[0].paidAt;
      }
    }

    // Determine success status based on session and payment status
    let success = false;
    let orderStatus = 'pending';

    if (stripeSession.status === 'complete') {
      if (stripeSession.payment_status === 'paid') {
        success = true;
        orderStatus = 'paid';
      } else if (stripeSession.payment_status === 'unpaid') {
        success = false;
        orderStatus = 'payment_pending';
      }
    } else if (stripeSession.status === 'open') {
      success = false;
      orderStatus = 'payment_pending';
    } else if (stripeSession.status === 'expired') {
      success = false;
      orderStatus = 'payment_expired';
    }

    // Map order state to user-friendly status
    const orderStateMapping: { [key: string]: string } = {
      'payment_received': 'Payment Confirmed',
      'payment_pending': 'Payment Pending',
      'payment_failed': 'Payment Failed',
      'configuring': 'Configuring',
      'analyzing': 'Analyzing',
      'ready_to_start': 'Ready to Start',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'disputed': 'Disputed',
    };

    const displayStatus = orderStateMapping[order.state || 'unknown'] || order.state || 'Unknown';

    return NextResponse.json({
      success,
      orderId,
      sessionId,
      amount: dbSession.amountTotal,
      currency: dbSession.currency,
      orderStatus: displayStatus,
      sessionStatus: stripeSession.status,
      paymentStatus: stripeSession.payment_status,
      paidAt: order.paidAt,
    });

  } catch (error) {
    console.error('[VERIFY PAYMENT] Error verifying payment session:', {
      error: error instanceof Error ? error.message : error,
      orderId: (await params).id,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      switch (stripeError.type) {
        case 'StripeInvalidRequestError':
          if (stripeError.message?.includes('No such checkout session')) {
            return NextResponse.json(
              { error: 'Session not found or has expired' },
              { status: 404 }
            );
          }
          return NextResponse.json(
            { error: 'Invalid session request', details: stripeError.message },
            { status: 400 }
          );
        case 'StripeAuthenticationError':
          console.error('Stripe Authentication Error:', stripeError.message);
          return NextResponse.json(
            { error: 'Payment system configuration error' },
            { status: 500 }
          );
        default:
          console.error('Stripe Error:', stripeError);
          return NextResponse.json(
            { error: 'Payment verification failed' },
            { status: 500 }
          );
      }
    }

    // Generic error for unknown issues
    return NextResponse.json(
      { 
        error: 'Failed to verify payment session', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}