import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { stripeCheckoutSessions } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Authenticate the request
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the checkout session from our database
    const checkoutSessionData = await db
      .select({
        id: stripeCheckoutSessions.id,
        stripeSessionId: stripeCheckoutSessions.stripeSessionId,
        orderId: stripeCheckoutSessions.orderId,
        paymentIntentId: stripeCheckoutSessions.paymentIntentId,
        status: stripeCheckoutSessions.status,
      })
      .from(stripeCheckoutSessions)
      .where(eq(stripeCheckoutSessions.id, sessionId))
      .limit(1);

    if (checkoutSessionData.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const dbSession = checkoutSessionData[0];

    // Verify the user has access to this session's order
    if (session.userType === 'account') {
      const orderData = await db
        .select({ accountId: orders.accountId })
        .from(orders)
        .where(eq(orders.id, dbSession.orderId))
        .limit(1);

      if (orderData.length === 0 || orderData[0].accountId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // If no payment intent ID, no receipt available yet
    if (!dbSession.paymentIntentId) {
      return NextResponse.json({ 
        receiptUrl: null,
        message: 'Payment not yet completed' 
      });
    }

    try {
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(dbSession.paymentIntentId);
      
      // Get the charge associated with this payment intent
      if (paymentIntent.latest_charge) {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
        
        return NextResponse.json({
          receiptUrl: charge.receipt_url,
          receiptEmail: charge.receipt_email,
          receiptNumber: charge.receipt_number,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          description: charge.description,
          billingDetails: charge.billing_details,
          created: new Date(charge.created * 1000).toISOString(),
        });
      } else {
        return NextResponse.json({ 
          receiptUrl: null,
          message: 'No charge found for this payment' 
        });
      }
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      
      // If Stripe can't find the payment intent, return gracefully
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ 
          receiptUrl: null,
          message: 'Receipt not available from Stripe' 
        });
      }
      
      throw stripeError;
    }

  } catch (error: any) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}