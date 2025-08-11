import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripeService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createPaymentIntentSchema = z.object({
  currency: z.string().optional().default('USD'),
  description: z.string().optional(),
  automaticPaymentMethods: z.boolean().optional().default(true),
  setupFutureUsage: z.enum(['on_session', 'off_session']).optional(),
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
    // For account users, userId IS the accountId
    const accountId = userType === 'account' ? userId : session.accountId;

    // Parse request body - handle empty body gracefully
    let body = {};
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (e) {
          console.error('[PAYMENT INTENT] Failed to parse JSON body:', e);
          body = {}; // Use empty object if parsing fails
        }
      }
    }
    
    const validatedData = createPaymentIntentSchema.parse(body);

    // For account users, verify they own this order
    // For internal users, allow access to any order
    let orderQuery;
    if (userType === 'account') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Account ID required' },
          { status: 400 }
        );
      }
      
      console.log('[PAYMENT INTENT] Account user access check:', {
        userType,
        userId,
        orderId
      });
      
      orderQuery = db
        .select({
          order: orders,
          account: accounts,
        })
        .from(orders)
        .leftJoin(accounts, eq(orders.accountId, accounts.id))
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.accountId, userId) // userId IS the accountId for account users
          )
        );
    } else {
      // Internal user - can access any order
      orderQuery = db
        .select({
          order: orders,
          account: accounts,
        })
        .from(orders)
        .leftJoin(accounts, eq(orders.accountId, accounts.id))
        .where(eq(orders.id, orderId));
    }

    const result = await orderQuery.limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    const { order, account } = result[0];

    if (!account) {
      return NextResponse.json(
        { error: 'Order account not found' },
        { status: 400 }
      );
    }

    // Validate order is in a state that can accept payment
    if (order.state === 'configuring' || order.state === 'analyzing') {
      return NextResponse.json(
        { error: 'Order is not ready for payment. Please complete the configuration and review process first.' },
        { status: 400 }
      );
    }

    if (order.state === 'payment_received' || order.paidAt) {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      );
    }

    // Check if payment intent already exists
    const existingPI = await StripeService.getPaymentIntentByOrder(orderId);
    if (existingPI && existingPI.paymentIntent.status === 'succeeded') {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      );
    }

    // If there's an existing payment intent that's not succeeded, return it
    if (existingPI && 
        ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPI.paymentIntent.status)
    ) {
      return NextResponse.json({
        success: true,
        clientSecret: existingPI.dbPaymentIntent.clientSecret,
        paymentIntentId: existingPI.paymentIntent.id,
        status: existingPI.paymentIntent.status,
        amount: existingPI.dbPaymentIntent.amount,
        currency: existingPI.dbPaymentIntent.currency,
      });
    }

    // Use the order's total retail amount for payment
    const amount = order.totalRetail;
    
    console.log('[PAYMENT INTENT] Order payment details:', {
      orderId,
      totalRetail: order.totalRetail,
      subtotalRetail: order.subtotalRetail,
      state: order.state,
      invoicedAt: order.invoicedAt,
      hasInvoiceData: !!order.invoiceData
    });
    
    if (!amount || amount <= 0) {
      console.error('[PAYMENT INTENT] Invalid amount:', {
        amount,
        totalRetail: order.totalRetail,
        orderState: order.state
      });
      return NextResponse.json(
        { 
          error: 'Order has no valid amount to collect payment for',
          debug: {
            amount,
            totalRetail: order.totalRetail,
            state: order.state,
            invoicedAt: order.invoicedAt
          }
        },
        { status: 400 }
      );
    }

    // Create payment intent and update order state atomically to prevent race conditions
    const { paymentIntent, dbPaymentIntent } = await db.transaction(async (tx) => {
      // First create the payment intent (this might fail)
      const paymentIntentResult = await StripeService.createPaymentIntent({
        orderId,
        accountId: account.id,
        amount,
        currency: validatedData.currency,
        description: validatedData.description || `Payment for Order #${orderId.substring(0, 8)}`,
        automaticPaymentMethods: validatedData.automaticPaymentMethods,
        setupFutureUsage: validatedData.setupFutureUsage,
        metadata: {
          orderType: order.orderType,
          orderState: order.state || 'unknown',
          companyName: account.companyName || account.contactName || 'Unknown',
        },
      });

      // Only update order state if payment intent creation succeeded
      if (order.state !== 'payment_pending') {
        await tx
          .update(orders)
          .set({
            state: 'payment_pending',
            status: 'payment_pending', // Also update status for consistency
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
      }

      return paymentIntentResult;
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: dbPaymentIntent.amount,
      currency: dbPaymentIntent.currency,
      publishableKey: StripeService.getPublishableKey(),
    });

  } catch (error) {
    console.error('[PAYMENT INTENT] Error creating payment intent:', {
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
        case 'StripeCardError':
          return NextResponse.json(
            { error: 'Card was declined', details: stripeError.message },
            { status: 402 }
          );
        case 'StripeRateLimitError':
          return NextResponse.json(
            { error: 'Too many requests, please try again later' },
            { status: 429 }
          );
        case 'StripeInvalidRequestError':
          return NextResponse.json(
            { error: 'Invalid payment request', details: stripeError.message },
            { status: 400 }
          );
        case 'StripeAPIError':
          console.error('Stripe API Error:', stripeError.message);
          return NextResponse.json(
            { error: 'Payment service temporarily unavailable' },
            { status: 503 }
          );
        case 'StripeConnectionError':
          console.error('Stripe Connection Error:', stripeError.message);
          return NextResponse.json(
            { error: 'Payment service temporarily unavailable' },
            { status: 503 }
          );
        case 'StripeAuthenticationError':
          console.error('Stripe Authentication Error:', stripeError.message);
          return NextResponse.json(
            { error: 'Payment system configuration error' },
            { status: 500 }
          );
      }
    }

    // Handle environment validation errors
    if (error instanceof Error && error.message.includes('Stripe configuration invalid')) {
      console.error('Stripe environment validation failed:', error.message);
      return NextResponse.json(
        { error: 'Payment system not properly configured' },
        { status: 500 }
      );
    }

    // Generic error for unknown issues
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}