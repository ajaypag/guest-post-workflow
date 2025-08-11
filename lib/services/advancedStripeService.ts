import Stripe from 'stripe';
import { db } from '@/lib/db/connection';
import { 
  stripePaymentIntents, 
  stripeCustomers, 
  payments,
  invoices
} from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, desc } from 'drizzle-orm';
import { StripeService } from './stripeService';

/**
 * Advanced Stripe Service with production-ready features
 * Extends basic StripeService with enterprise-level capabilities
 */
export class AdvancedStripeService extends StripeService {

  /**
   * Create a payment intent with advanced options
   */
  static async createAdvancedPaymentIntent(options: {
    orderId: string;
    accountId: string;
    amount: number;
    currency?: string;
    paymentTiming?: 'immediate' | 'deposit' | 'net_terms' | 'installments';
    depositPercentage?: number;
    netTermsDays?: number;
    installmentPlan?: {
      numberOfPayments: number;
      frequency: 'weekly' | 'monthly' | 'quarterly';
    };
    savePaymentMethod?: boolean;
    automaticTax?: boolean;
    metadata?: Record<string, string>;
  }) {
    const {
      paymentTiming = 'immediate',
      depositPercentage,
      netTermsDays,
      installmentPlan,
      savePaymentMethod = false,
      automaticTax = false,
      ...baseOptions
    } = options;

    // Handle different payment timing options
    let finalAmount = options.amount;
    let futurePayments: Array<{ amount: number; dueDate: Date }> = [];

    switch (paymentTiming) {
      case 'deposit':
        if (!depositPercentage || depositPercentage <= 0 || depositPercentage >= 100) {
          throw new Error('Deposit percentage must be between 1 and 99');
        }
        finalAmount = Math.round(options.amount * (depositPercentage / 100));
        futurePayments.push({
          amount: options.amount - finalAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
        break;

      case 'net_terms':
        if (!netTermsDays || netTermsDays <= 0) {
          throw new Error('Net terms days must be greater than 0');
        }
        // Create invoice instead of immediate payment
        return this.createNetTermsInvoice({
          ...baseOptions,
          amount: options.amount,
          dueDate: new Date(Date.now() + netTermsDays * 24 * 60 * 60 * 1000)
        });

      case 'installments':
        if (!installmentPlan || installmentPlan.numberOfPayments <= 1) {
          throw new Error('Installment plan must have more than 1 payment');
        }
        return this.createInstallmentPlan({
          ...baseOptions,
          amount: options.amount,
          installmentPlan
        });

      case 'immediate':
      default:
        // Use full amount immediately
        break;
    }

    // Create payment intent with advanced features
    const paymentIntentOptions = {
      ...baseOptions,
      amount: finalAmount,
      setupFutureUsage: savePaymentMethod ? 'off_session' as const : undefined,
      metadata: {
        paymentTiming,
        depositPercentage: depositPercentage?.toString() || '',
        netTermsDays: netTermsDays?.toString() || '',
        hasFuturePayments: futurePayments.length > 0 ? 'true' : 'false',
        ...options.metadata,
      },
    };

    const result = await super.createPaymentIntent(paymentIntentOptions);

    // Store future payment schedule if applicable
    if (futurePayments.length > 0) {
      await this.storeFuturePaymentSchedule(options.orderId, futurePayments);
    }

    return result;
  }

  /**
   * Create a customer portal session for self-service management
   */
  static async createCustomerPortalSession(accountId: string, returnUrl: string): Promise<string> {
    const customerResult = await db
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.accountId, accountId))
      .limit(1);

    if (customerResult.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customerResult[0];
    const stripe = this.getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl,
      // Configuration must be created via Stripe Dashboard or API separately
      // For now, use default configuration
    });

    return session.url;
  }

  /**
   * Process refund with proper audit trail
   */
  static async processRefund(options: {
    paymentIntentId: string;
    amount?: number; // If not provided, full refund
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
    notifyCustomer?: boolean;
  }): Promise<{
    refund: Stripe.Refund;
    dbPaymentRecord: typeof payments.$inferSelect;
  }> {
    const { paymentIntentId, amount, reason, metadata = {}, notifyCustomer = true } = options;

    const stripe = this.getStripeClient();
    
    // Get the original payment intent
    const dbPaymentIntent = await db
      .select()
      .from(stripePaymentIntents)
      .where(eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (dbPaymentIntent.length === 0) {
      throw new Error('Payment intent not found');
    }

    const paymentRecord = dbPaymentIntent[0];

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
      metadata: {
        orderId: paymentRecord.orderId,
        processedBy: 'system', // TODO: Add user context
        ...metadata,
      },
    });

    // Get the order to find the accountId
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, paymentRecord.orderId)
    });

    if (!order || !order.accountId) {
      throw new Error('Order or account not found for refund');
    }

    // Create refund record in our database
    const [dbRefund] = await db
      .insert(payments)
      .values({
        orderId: paymentRecord.orderId,
        accountId: order.accountId,
        amount: -(refund.amount), // Negative amount for refund
        currency: refund.currency.toUpperCase(),
        status: 'completed',
        method: 'stripe',
        transactionId: refund.id,
        processorResponse: JSON.stringify(refund),
        notes: `Refund for payment ${paymentIntentId}${reason ? ` (${reason})` : ''}`,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Send notification if requested
    if (notifyCustomer) {
      await this.sendRefundNotification(paymentRecord.orderId, refund);
    }

    return { refund, dbPaymentRecord: dbRefund };
  }

  /**
   * Handle dispute (chargeback) notifications
   */
  static async handleDispute(dispute: Stripe.Dispute): Promise<void> {
    // Log dispute for manual review
    console.log(`🚨 Dispute received: ${dispute.id}`, {
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      paymentIntent: dispute.payment_intent,
    });

    // Create internal record for dispute tracking
    // TODO: Implement disputes table and management system
    
    // Send alert to admin
    await this.sendDisputeAlert(dispute);
  }

  /**
   * Generate comprehensive payment report
   */
  static async generatePaymentReport(options: {
    startDate: Date;
    endDate: Date;
    accountId?: string;
    currency?: string;
  }): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successRate: number;
    averageTransactionValue: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    dailyBreakdown: Array<{ date: string; revenue: number; transactions: number }>;
  }> {
    // TODO: Implement comprehensive reporting
    // This is a placeholder for the structure
    throw new Error('Payment reporting not yet implemented');
  }

  /**
   * Validate webhook signature with enhanced security
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    timestamp?: number
  ): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Add timestamp validation for replay attack prevention
    if (timestamp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const tolerance = 300; // 5 minutes

      if (Math.abs(currentTime - timestamp) > tolerance) {
        throw new Error('Webhook timestamp too old - possible replay attack');
      }
    }

    return super.constructWebhookEvent(payload, signature, webhookSecret);
  }

  // Private helper methods

  private static async createNetTermsInvoice(options: {
    orderId: string;
    accountId: string;
    amount: number;
    dueDate: Date;
    currency?: string;
    description?: string;
  }) {
    // TODO: Implement net terms invoice creation
    throw new Error('Net terms invoicing not yet implemented');
  }

  private static async createInstallmentPlan(options: {
    orderId: string;
    accountId: string;
    amount: number;
    installmentPlan: {
      numberOfPayments: number;
      frequency: 'weekly' | 'monthly' | 'quarterly';
    };
  }) {
    // TODO: Implement installment plan creation using Stripe Subscriptions
    throw new Error('Installment plans not yet implemented');
  }

  private static async storeFuturePaymentSchedule(
    orderId: string, 
    futurePayments: Array<{ amount: number; dueDate: Date }>
  ) {
    // TODO: Implement future payment schedule storage
    console.log('Storing future payment schedule for order:', orderId, futurePayments);
  }

  private static async sendRefundNotification(orderId: string, refund: Stripe.Refund) {
    // TODO: Implement refund notification email
    console.log('Sending refund notification for order:', orderId, 'refund:', refund.id);
  }

  private static async sendDisputeAlert(dispute: Stripe.Dispute) {
    // TODO: Implement dispute alert email to admin
    console.log('Sending dispute alert:', dispute.id);
  }

  private static getStripeClient() {
    // Access the parent class method
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    });
  }
}