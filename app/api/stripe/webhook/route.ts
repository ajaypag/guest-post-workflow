import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeService } from '@/lib/services/stripeService';
import { db } from '@/lib/db/connection';
import { stripeWebhooks } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { EmailService } from '@/lib/services/emailService';

// Rate limiting and security for webhooks
const WEBHOOK_MAX_SIZE = 1024 * 1024; // 1MB max payload size
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Max 100 requests per minute per IP

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown';

    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get the webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > WEBHOOK_MAX_SIZE) {
      console.error(`Webhook payload too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    // Get the request body and signature
    const body = await request.text();
    
    // Double-check body size after reading
    if (body.length > WEBHOOK_MAX_SIZE) {
      console.error(`Webhook body too large: ${body.length} bytes`);
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Construct and verify the webhook event
    let event: Stripe.Event;
    try {
      event = StripeService.constructWebhookEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check if we've already processed this event
    const existingWebhook = await db
      .select()
      .from(stripeWebhooks)
      .where(eq(stripeWebhooks.stripeEventId, event.id))
      .limit(1);

    if (existingWebhook.length > 0) {
      console.log(`Webhook event ${event.id} already processed`);
      return NextResponse.json({ received: true });
    }

    // Create webhook record
    const [webhookRecord] = await db
      .insert(stripeWebhooks)
      .values({
        stripeEventId: event.id,
        eventType: event.type,
        status: 'pending',
        eventData: event,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    try {
      // Process the webhook based on event type
      await processWebhookEvent(event, webhookRecord.id);

      // Mark as processed
      await db
        .update(stripeWebhooks)
        .set({
          status: 'processed',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhooks.id, webhookRecord.id));

      console.log(`Successfully processed webhook event: ${event.type}`);

    } catch (error) {
      console.error(`Error processing webhook event ${event.id}:`, error);

      // Update webhook record with error
      await db
        .update(stripeWebhooks)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: 1,
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhooks.id, webhookRecord.id));

      // Return 500 to trigger Stripe retry
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event, webhookRecordId);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event, webhookRecordId);
      break;

    case 'payment_intent.canceled':
      await handlePaymentIntentCanceled(event, webhookRecordId);
      break;

    case 'payment_intent.requires_action':
      await handlePaymentIntentRequiresAction(event, webhookRecordId);
      break;

    case 'payment_intent.processing':
      await handlePaymentIntentProcessing(event, webhookRecordId);
      break;

    case 'payment_method.attached':
      await handlePaymentMethodAttached(event, webhookRecordId);
      break;

    case 'customer.created':
    case 'customer.updated':
      // These events don't require special handling for our use case
      // but we log them for monitoring
      console.log(`Customer event received: ${event.type}`);
      break;

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
      // Mark as skipped for unhandled events
      await db
        .update(stripeWebhooks)
        .set({
          status: 'skipped',
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhooks.id, webhookRecordId));
      break;
  }
}

async function handlePaymentIntentSucceeded(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log(`Payment succeeded: ${paymentIntent.id}`);

  // Update our payment intent record and handle successful payment
  await StripeService.updatePaymentIntentFromWebhook(
    paymentIntent.id,
    paymentIntent,
    event.id
  );

  // Update webhook record with related entities
  await updateWebhookRelations(webhookRecordId, paymentIntent.id);
}

async function handlePaymentIntentFailed(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log(`Payment failed: ${paymentIntent.id}`, paymentIntent.last_payment_error);

  // Update our payment intent record
  await StripeService.updatePaymentIntentFromWebhook(
    paymentIntent.id,
    paymentIntent,
    event.id
  );

  // Update webhook record with related entities
  await updateWebhookRelations(webhookRecordId, paymentIntent.id);

  // Send failure notification and update order state
  await handlePaymentFailure(paymentIntent);
}

async function handlePaymentIntentCanceled(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log(`Payment canceled: ${paymentIntent.id}`);

  // Update our payment intent record
  await StripeService.updatePaymentIntentFromWebhook(
    paymentIntent.id,
    paymentIntent,
    event.id
  );

  // Update webhook record with related entities
  await updateWebhookRelations(webhookRecordId, paymentIntent.id);
}

async function handlePaymentIntentRequiresAction(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log(`Payment requires action: ${paymentIntent.id}`);

  // Update our payment intent record
  await StripeService.updatePaymentIntentFromWebhook(
    paymentIntent.id,
    paymentIntent,
    event.id
  );

  // Update webhook record with related entities
  await updateWebhookRelations(webhookRecordId, paymentIntent.id);

  // Send notification to customer about required action (3D Secure, etc.)
  await handlePaymentActionRequired(paymentIntent);
}

async function handlePaymentIntentProcessing(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log(`Payment processing: ${paymentIntent.id}`);

  // Update our payment intent record
  await StripeService.updatePaymentIntentFromWebhook(
    paymentIntent.id,
    paymentIntent,
    event.id
  );

  // Update webhook record with related entities
  await updateWebhookRelations(webhookRecordId, paymentIntent.id);
}

async function handlePaymentMethodAttached(event: Stripe.Event, webhookRecordId: string): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  
  console.log(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);

  // This event is informational - payment methods are handled within payment intents
  // but we can log it for audit purposes
}

async function updateWebhookRelations(webhookRecordId: string, stripePaymentIntentId: string): Promise<void> {
  // Find our payment intent record to get the order ID
  const paymentIntentData = await StripeService.getPaymentIntentByOrder(''); // We need a different approach

  // Alternative: Query our stripe_payment_intents table directly
  const result = await db.query.stripePaymentIntents?.findFirst({
    where: (table: any, { eq }: any) => eq(table.stripePaymentIntentId, stripePaymentIntentId),
  });

  if (result) {
    await db
      .update(stripeWebhooks)
      .set({
        paymentIntentId: result.id,
        orderId: result.orderId,
        updatedAt: new Date(),
      })
      .where(eq(stripeWebhooks.id, webhookRecordId));
  }
}

/**
 * Handle payment failure - notify customer and internal team, update order state
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      console.error('No order ID found in payment intent metadata');
      return;
    }

    // Update order state to payment_failed if it was pending
    const order = await db.query.orders?.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, orderId),
      with: {
        account: true,
      }
    });

    if (order && order.state === 'payment_pending') {
      await db
        .update(orders)
        .set({
          state: 'payment_failed',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      console.log(`Order ${orderId} marked as payment_failed`);
    }

    // Send failure notification email
    if (order?.account) {
      const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      const errorCode = paymentIntent.last_payment_error?.code || 'unknown_error';

      try {
        // TODO: Implement proper email notification
        console.log(`Payment failed notification needed for ${order.account.email}`);
        /*await EmailService.send({
          to: order.account.email,
          subject: `Payment Failed - Order #${orderId.substring(0, 8)}`,
          text: `Your payment for Order #${orderId.substring(0, 8)} has failed. Please try again or contact support.\n\nError: ${errorMessage}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Failed</h2>
              <p>Your payment for Order #${orderId.substring(0, 8)} has failed.</p>
              <p><strong>Error:</strong> ${errorMessage}</p>
              <p>Please try submitting your payment again, or contact our support team if you continue to experience issues.</p>
              <p>Best regards,<br>The PostFlow Team</p>
            </div>
          `,
        });*/

        // Also notify internal team
        /*await EmailService.send({
          to: 'admin@postflow.outreachlabs.net',
          subject: `Payment Failed - Order ${orderId.substring(0, 8)}`,
          text: `Payment failed for Order ${orderId}. Error: ${errorCode} - ${errorMessage}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h3>Payment Failed</h3>
              <p><strong>Order:</strong> ${orderId}</p>
              <p><strong>Customer:</strong> ${order.account.email}</p>
              <p><strong>Error Code:</strong> ${errorCode}</p>
              <p><strong>Error Message:</strong> ${errorMessage}</p>
              <p><strong>Payment Intent:</strong> ${paymentIntent.id}</p>
            </div>
          `,
        });*/
      } catch (emailError) {
        console.error('Failed to send payment failure notification email:', emailError);
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle payment requiring action - notify customer about 3D Secure or similar
 */
async function handlePaymentActionRequired(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      console.error('No order ID found in payment intent metadata');
      return;
    }

    // Get order details
    const order = await db.query.orders?.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, orderId),
      with: {
        account: true,
      }
    });

    if (order?.account) {
      try {
        // TODO: Implement proper email notification
        console.log(`Payment failed notification needed for ${order.account.email}`);
        /*await EmailService.send({
          to: order.account.email,
          subject: `Payment Action Required - Order #${orderId.substring(0, 8)}`,
          text: `Your payment for Order #${orderId.substring(0, 8)} requires additional verification. Please complete the payment process.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Action Required</h2>
              <p>Your payment for Order #${orderId.substring(0, 8)} requires additional verification (such as 3D Secure).</p>
              <p>Please return to your order page and complete the payment process.</p>
              <p>This is a security measure to protect your payment.</p>
              <p>Best regards,<br>The PostFlow Team</p>
            </div>
          `,
        });*/
      } catch (emailError) {
        console.error('Failed to send payment action required notification email:', emailError);
      }
    }
  } catch (error) {
    console.error('Error handling payment action required:', error);
  }
}