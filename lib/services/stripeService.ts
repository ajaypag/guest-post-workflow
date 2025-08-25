import Stripe from 'stripe';
import { db } from '@/lib/db/connection';
import { 
  stripePaymentIntents, 
  stripeCustomers, 
  payments,
  stripeCheckoutSessions
} from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';


// Initialize Stripe with the secret key (lazy initialization to avoid build errors)
let stripe: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.error('[STRIPE] STRIPE_SECRET_KEY is not configured');
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    // Validate that we're using a secret key (starts with 'sk_')
    if (!secretKey.startsWith('sk_')) {
      console.error('[STRIPE] Invalid secret key format - appears to be a publishable key:', {
        keyPrefix: secretKey.substring(0, 3),
        isPublishable: secretKey.startsWith('pk_')
      });
      throw new Error('STRIPE_SECRET_KEY appears to be a publishable key. Secret keys should start with "sk_"');
    }
    
    // Log key type for debugging (without exposing the actual key)
    console.log('[STRIPE] Initializing Stripe client with key type:', {
      isTest: secretKey.startsWith('sk_test_'),
      isLive: secretKey.startsWith('sk_live_'),
      keyLength: secretKey.length
    });
    
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil', // Latest stable API version
      typescript: true,
    });
  }
  return stripe;
};

interface CreatePaymentIntentOptions {
  orderId: string;
  accountId: string;
  amount: number; // Amount in cents
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  automaticPaymentMethods?: boolean;
  setupFutureUsage?: 'on_session' | 'off_session';
}

interface CreateOrRetrieveCustomerOptions {
  accountId: string;
  email: string;
  name?: string;
  billingAddress?: Stripe.AddressParam;
  metadata?: Record<string, string>;
}

export class StripeService {
  /**
   * Create or retrieve a Stripe customer for the given account
   */
  static async createOrRetrieveCustomer(options: CreateOrRetrieveCustomerOptions): Promise<{
    stripeCustomer: Stripe.Customer;
    dbCustomer: typeof stripeCustomers.$inferSelect;
  }> {
    const { accountId, email, name, billingAddress, metadata = {} } = options;

    // Check if we already have a customer for this account
    const existingCustomer = await db
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.accountId, accountId))
      .limit(1);

    if (existingCustomer.length > 0) {
      const dbCustomer = existingCustomer[0];
      
      // Retrieve the customer from Stripe to ensure it still exists
      try {
        const stripeCustomer = await getStripeClient().customers.retrieve(dbCustomer.stripeCustomerId) as Stripe.Customer;
        
        if (stripeCustomer.deleted) {
          // Customer was deleted in Stripe, create a new one
          throw new Error('Customer deleted in Stripe');
        }
        
        return { stripeCustomer, dbCustomer };
      } catch (error) {
        // Customer doesn't exist in Stripe anymore, create a new one
        console.warn(`Stripe customer ${dbCustomer.stripeCustomerId} not found, creating new one:`, error);
      }
    }

    // Create new customer in Stripe
    const stripeCustomer = await getStripeClient().customers.create({
      email,
      name,
      address: billingAddress,
      metadata: {
        accountId,
        ...metadata,
      },
    });

    // Save customer to database
    const [dbCustomer] = await db
      .insert(stripeCustomers)
      .values({
        accountId,
        stripeCustomerId: stripeCustomer.id,
        email,
        name: name || null,
        billingAddress: billingAddress ? JSON.stringify(billingAddress) : null,
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { stripeCustomer, dbCustomer };
  }

  /**
   * Create a new payment intent for an order
   */
  static async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    dbPaymentIntent: typeof stripePaymentIntents.$inferSelect;
  }> {
    const {
      orderId,
      accountId,
      amount,
      currency = 'USD',
      description,
      metadata = {},
      idempotencyKey,
      automaticPaymentMethods = true,
      setupFutureUsage,
    } = options;

    // Validate order exists and belongs to account
    const order = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.accountId, accountId)
        )
      )
      .limit(1);

    if (order.length === 0) {
      throw new Error('Order not found or access denied');
    }

    const orderData = order[0];

    // Get account information
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (account.length === 0) {
      throw new Error('Account not found');
    }

    const accountData = account[0];

    // Create or retrieve Stripe customer
    const { stripeCustomer } = await this.createOrRetrieveCustomer({
      accountId,
      email: accountData.email,
      name: accountData.companyName || accountData.contactName,
    });

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || `${orderId}-${Date.now()}`;

    // Check if payment intent already exists with this idempotency key
    const existingPaymentIntent = await db
      .select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.idempotencyKey, finalIdempotencyKey))
      .limit(1);

    if (existingPaymentIntent.length > 0) {
      const dbPaymentIntent = existingPaymentIntent[0];
      const paymentIntent = await getStripeClient().paymentIntents.retrieve(dbPaymentIntent.stripePaymentIntentId);
      return { paymentIntent, dbPaymentIntent };
    }

    // Create payment intent in Stripe
    console.log('[STRIPE] Creating payment intent:', {
      amount,
      currency: currency.toLowerCase(),
      orderId: orderId.substring(0, 8),
      hasCustomer: !!stripeCustomer.id
    });
    
    const paymentIntent = await getStripeClient().paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: stripeCustomer.id,
      description: description || `Payment for Order #${orderData.id.substring(0, 8)}`,
      automatic_payment_methods: automaticPaymentMethods ? { 
        enabled: true,
        allow_redirects: 'never' // Prevent redirect-based payment methods for better UX
      } : undefined,
      setup_future_usage: setupFutureUsage,
      metadata: {
        orderId,
        accountId,
        orderType: orderData.orderType,
        ...metadata,
      },
    }, {
      idempotencyKey: finalIdempotencyKey,
    });

    // Save payment intent to database
    const [dbPaymentIntent] = await db
      .insert(stripePaymentIntents)
      .values({
        orderId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: stripeCustomer.id,
        amount,
        currency: currency.toUpperCase(),
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        metadata: {
          orderId,
          accountId,
          orderType: orderData.orderType,
          ...metadata,
        },
        idempotencyKey: finalIdempotencyKey,
        confirmationMethod: paymentIntent.confirmation_method as string,
        setupFutureUsage: paymentIntent.setup_future_usage as string,
        amountCapturable: paymentIntent.amount_capturable,
        amountCaptured: (paymentIntent as any).amount_captured || 0,
        amountReceived: (paymentIntent as any).amount_received || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { paymentIntent, dbPaymentIntent };
  }

  /**
   * Update payment intent status from webhook
   */
  static async updatePaymentIntentFromWebhook(
    stripePaymentIntentId: string,
    paymentIntent: Stripe.PaymentIntent,
    eventId: string
  ): Promise<void> {
    // Find the payment intent in our database
    const existingPI = await db
      .select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.stripePaymentIntentId, stripePaymentIntentId))
      .limit(1);

    if (existingPI.length === 0) {
      console.warn(`Payment intent ${stripePaymentIntentId} not found in database`);
      return;
    }

    const dbPaymentIntent = existingPI[0];

    // Update payment intent
    await db
      .update(stripePaymentIntents)
      .set({
        status: paymentIntent.status,
        paymentMethodId: paymentIntent.payment_method as string,
        amountCapturable: paymentIntent.amount_capturable,
        amountCaptured: (paymentIntent as any).amount_captured || 0,
        amountReceived: (paymentIntent as any).amount_received || 0,
        lastWebhookEventId: eventId,
        lastError: paymentIntent.last_payment_error ? JSON.stringify(paymentIntent.last_payment_error) : null,
        failureCode: paymentIntent.last_payment_error?.code || null,
        failureMessage: paymentIntent.last_payment_error?.message || null,
        confirmedAt: paymentIntent.status === 'requires_action' || 
                     paymentIntent.status === 'processing' ||
                     paymentIntent.status === 'succeeded' ? new Date() : null,
        succeededAt: paymentIntent.status === 'succeeded' ? new Date() : null,
        canceledAt: paymentIntent.status === 'canceled' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(stripePaymentIntents.id, dbPaymentIntent.id));

    // Handle successful payment
    if (paymentIntent.status === 'succeeded') {
      await this.handleSuccessfulPayment(dbPaymentIntent.orderId, paymentIntent);
    }
  }

  /**
   * Handle successful payment by updating order status and creating payment record
   */
  private static async handleSuccessfulPayment(
    orderId: string,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    // Create payment record
    await db.insert(payments).values({
      orderId,
      accountId: paymentIntent.metadata?.accountId!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'completed',
      method: 'stripe',
      transactionId: paymentIntent.id,
      stripePaymentIntentId: paymentIntent.id,
      processorResponse: JSON.stringify(paymentIntent),
      processedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update order status to payment_received
    await db
      .update(orders)
      .set({
        state: 'payment_received',
        status: 'paid', // Update the main status to paid
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    console.log(`Order ${orderId} payment completed successfully`);
  }

  /**
   * Cancel a payment intent
   */
  static async cancelPaymentIntent(stripePaymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await getStripeClient().paymentIntents.cancel(stripePaymentIntentId);
    
    // Update in database
    await db
      .update(stripePaymentIntents)
      .set({
        status: paymentIntent.status,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stripePaymentIntents.stripePaymentIntentId, stripePaymentIntentId));

    return paymentIntent;
  }

  /**
   * Retrieve payment intent by order ID
   */
  static async getPaymentIntentByOrder(orderId: string): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    dbPaymentIntent: typeof stripePaymentIntents.$inferSelect;
  } | null> {
    const dbPaymentIntent = await db
      .select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.orderId, orderId))
      .limit(1);

    if (dbPaymentIntent.length === 0) {
      return null;
    }

    const pi = dbPaymentIntent[0];
    const paymentIntent = await getStripeClient().paymentIntents.retrieve(pi.stripePaymentIntentId);

    return { paymentIntent, dbPaymentIntent: pi };
  }

  /**
   * Construct webhook event from raw request
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get publishable key for frontend
   */
  static getPublishableKey(): string {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured');
    }
    return publishableKey;
  }

  /**
   * Create a new Checkout Session for hosted payment
   */
  static async createCheckoutSession(options: {
    orderId: string;
    accountId: string;
    amount: number; // Amount in cents
    currency?: string;
    description?: string;
    successUrl: string;
    cancelUrl: string;
    expiresAt?: Date;
    metadata?: Record<string, string>;
  }): Promise<{
    session: Stripe.Checkout.Session;
    dbSession: typeof stripeCheckoutSessions.$inferSelect;
  }> {
    const {
      orderId,
      accountId,
      amount,
      currency = 'USD',
      description,
      successUrl,
      cancelUrl,
      expiresAt,
      metadata = {},
    } = options;

    // Validate order exists and belongs to account
    const order = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.accountId, accountId)
        )
      )
      .limit(1);

    if (order.length === 0) {
      throw new Error('Order not found or access denied');
    }

    const orderData = order[0];

    // Get account information
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (account.length === 0) {
      throw new Error('Account not found');
    }

    const accountData = account[0];

    // Check if active session already exists for this order
    const existingSessions = await db
      .select()
      .from(stripeCheckoutSessions)
      .where(
        and(
          eq(stripeCheckoutSessions.orderId, orderId),
          eq(stripeCheckoutSessions.status, 'open')
        )
      )
      .limit(1);

    if (existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      // Retrieve the session from Stripe to ensure it still exists
      try {
        const stripeSession = await getStripeClient().checkout.sessions.retrieve(existingSession.stripeSessionId);
        
        if (stripeSession.status === 'open' && stripeSession.expires_at && stripeSession.expires_at > Math.floor(Date.now() / 1000)) {
          return { session: stripeSession, dbSession: existingSession };
        }
      } catch (error) {
        // Session doesn't exist in Stripe anymore, continue to create new one
        console.warn(`Existing checkout session ${existingSession.stripeSessionId} not found in Stripe, creating new one`);
      }
    }

    // Calculate expires_at timestamp (default 30 minutes from now)
    const expiresAtTimestamp = expiresAt 
      ? Math.floor(expiresAt.getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (30 * 60); // 30 minutes

    // Create checkout session in Stripe
    const session = await getStripeClient().checkout.sessions.create({
      mode: 'payment',
      customer_email: accountData.email,
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: description || `Guest Post Order #${orderId.substring(0, 8)}`,
            description: `${orderData.orderType} - ${accountData.companyName || accountData.contactName}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: expiresAtTimestamp,
      metadata: {
        orderId,
        accountId,
        orderType: orderData.orderType,
        ...metadata,
      },
      payment_intent_data: {
        metadata: {
          orderId,
          accountId,
          orderType: orderData.orderType,
          ...metadata,
        },
      },
      automatic_tax: {
        enabled: false, // Can be enabled later if needed
      },
    });

    // Save checkout session to database
    const [dbSession] = await db
      .insert(stripeCheckoutSessions)
      .values({
        orderId,
        stripeSessionId: session.id,
        status: session.status as string,
        mode: session.mode as string,
        successUrl,
        cancelUrl,
        customerEmail: accountData.email,
        amountTotal: amount,
        currency: currency.toUpperCase(),
        metadata: {
          orderId,
          accountId,
          orderType: orderData.orderType,
          ...metadata,
        },
        expiresAt: new Date(expiresAtTimestamp * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { session, dbSession };
  }

  /**
   * Retrieve a Checkout Session by ID
   */
  static async retrieveCheckoutSession(sessionId: string): Promise<{
    session: Stripe.Checkout.Session;
    dbSession: typeof stripeCheckoutSessions.$inferSelect | null;
  }> {
    // Retrieve from Stripe
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);

    // Retrieve from database
    const dbSession = await db
      .select()
      .from(stripeCheckoutSessions)
      .where(eq(stripeCheckoutSessions.stripeSessionId, sessionId))
      .limit(1);

    return {
      session,
      dbSession: dbSession.length > 0 ? dbSession[0] : null,
    };
  }

  /**
   * Update checkout session status from webhook or manual call
   */
  static async updateCheckoutSessionFromWebhook(
    sessionId: string,
    session: Stripe.Checkout.Session,
    eventId: string
  ): Promise<void> {
    // Find the checkout session in our database
    const existingSession = await db
      .select()
      .from(stripeCheckoutSessions)
      .where(eq(stripeCheckoutSessions.stripeSessionId, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      console.warn(`Checkout session ${sessionId} not found in database`);
      return;
    }

    const dbSession = existingSession[0];

    // Update checkout session
    await db
      .update(stripeCheckoutSessions)
      .set({
        status: session.status || 'unknown',
        paymentIntentId: session.payment_intent as string,
        completedAt: session.status === 'complete' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(stripeCheckoutSessions.id, dbSession.id));

    // Handle successful payment
    if (session.status === 'complete' && session.payment_intent) {
      await this.handleSuccessfulCheckoutSession(dbSession.orderId, session);
    }
  }

  /**
   * Handle successful checkout session by updating order status
   */
  private static async handleSuccessfulCheckoutSession(
    orderId: string,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    // Create payment record
    await db.insert(payments).values({
      orderId,
      accountId: session.metadata?.accountId!,
      amount: session.amount_total || 0,
      currency: session.currency?.toUpperCase() || 'USD',
      status: 'completed',
      method: 'stripe',
      transactionId: session.payment_intent as string,
      stripePaymentIntentId: session.payment_intent as string,
      processorResponse: JSON.stringify(session),
      processedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update order status to payment_received
    await db
      .update(orders)
      .set({
        state: 'payment_received',
        status: 'paid', // Update the main status to paid
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    console.log(`Order ${orderId} payment completed via checkout session ${session.id}`);
  }

  /**
   * Expire a checkout session
   */
  static async expireCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const session = await getStripeClient().checkout.sessions.expire(sessionId);
    
    // Update in database
    await db
      .update(stripeCheckoutSessions)
      .set({
        status: session.status || 'unknown',
        updatedAt: new Date(),
      })
      .where(eq(stripeCheckoutSessions.stripeSessionId, sessionId));

    return session;
  }

  /**
   * Get checkout session by order ID
   */
  static async getCheckoutSessionByOrder(orderId: string): Promise<{
    session: Stripe.Checkout.Session | null;
    dbSession: typeof stripeCheckoutSessions.$inferSelect | null;
  }> {
    const dbSession = await db
      .select()
      .from(stripeCheckoutSessions)
      .where(eq(stripeCheckoutSessions.orderId, orderId))
      .limit(1);

    if (dbSession.length === 0) {
      return { session: null, dbSession: null };
    }

    const session = await getStripeClient().checkout.sessions.retrieve(dbSession[0].stripeSessionId);

    return { session, dbSession: dbSession[0] };
  }
}