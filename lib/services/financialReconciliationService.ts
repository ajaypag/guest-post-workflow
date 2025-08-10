import { db } from '@/lib/db/connection';
import { 
  payments, 
  stripePaymentIntents, 
  invoices, 
  stripeWebhooks 
} from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, gte, lte, sql, desc, sum, count } from 'drizzle-orm';
import Stripe from 'stripe';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Financial Reconciliation Service
 * Handles payment reconciliation, reporting, and audit trails
 */
export class FinancialReconciliationService {
  
  /**
   * Reconcile Stripe payments with database records
   */
  static async reconcileStripePayments(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: {
      stripePayments: number;
      stripeAmount: number;
      dbPayments: number;
      dbAmount: number;
      discrepancies: number;
    };
    discrepancies: Array<{
      type: 'missing_in_db' | 'missing_in_stripe' | 'amount_mismatch';
      stripePaymentId?: string;
      dbPaymentId?: string;
      stripeAmount?: number;
      dbAmount?: number;
      details: string;
    }>;
    recommendations: string[];
  }> {
    const stripe = this.getStripeClient();
    
    // Fetch Stripe payments for the period
    const stripePayments: Stripe.PaymentIntent[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.paymentIntents.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        limit: 100,
        starting_after: startingAfter,
      });

      stripePayments.push(...response.data.filter(pi => pi.status === 'succeeded'));
      hasMore = response.has_more;
      startingAfter = response.data[response.data.length - 1]?.id;
    }

    // Fetch database payments for the same period
    const dbPayments = await db
      .select({
        payment: payments,
        stripePI: stripePaymentIntents,
      })
      .from(payments)
      .leftJoin(stripePaymentIntents, eq(payments.transactionId, stripePaymentIntents.stripePaymentIntentId))
      .where(
        and(
          eq(payments.method, 'stripe'),
          eq(payments.status, 'completed'),
          gte(payments.processedAt, startDate),
          lte(payments.processedAt, endDate)
        )
      );

    // Calculate summaries
    const stripeTotal = stripePayments.reduce((sum, pi) => sum + pi.amount, 0);
    const dbTotal = dbPayments.reduce((sum, { payment }) => sum + payment.amount, 0);

    // Find discrepancies
    const discrepancies: Array<{
      type: 'missing_in_db' | 'missing_in_stripe' | 'amount_mismatch';
      stripePaymentId?: string;
      dbPaymentId?: string;
      stripeAmount?: number;
      dbAmount?: number;
      details: string;
    }> = [];

    // Check for Stripe payments missing in DB
    for (const stripePI of stripePayments) {
      const dbPayment = dbPayments.find(({ payment }) => payment.transactionId === stripePI.id);
      
      if (!dbPayment) {
        discrepancies.push({
          type: 'missing_in_db',
          stripePaymentId: stripePI.id,
          stripeAmount: stripePI.amount,
          details: `Stripe payment ${stripePI.id} (${stripePI.amount / 100} ${stripePI.currency.toUpperCase()}) not found in database`,
        });
      } else if (dbPayment.payment.amount !== stripePI.amount) {
        discrepancies.push({
          type: 'amount_mismatch',
          stripePaymentId: stripePI.id,
          dbPaymentId: dbPayment.payment.id,
          stripeAmount: stripePI.amount,
          dbAmount: dbPayment.payment.amount,
          details: `Amount mismatch: Stripe has ${stripePI.amount / 100}, DB has ${dbPayment.payment.amount / 100}`,
        });
      }
    }

    // Check for DB payments missing in Stripe
    for (const { payment } of dbPayments) {
      if (payment.transactionId) {
        const stripePayment = stripePayments.find(pi => pi.id === payment.transactionId);
        
        if (!stripePayment) {
          discrepancies.push({
            type: 'missing_in_stripe',
            dbPaymentId: payment.id,
            dbAmount: payment.amount,
            details: `DB payment ${payment.id} references Stripe payment ${payment.transactionId} which was not found`,
          });
        }
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (discrepancies.length > 0) {
      recommendations.push('Review and resolve payment discrepancies');
      
      if (discrepancies.some(d => d.type === 'missing_in_db')) {
        recommendations.push('Check webhook processing for missing database records');
      }
      
      if (discrepancies.some(d => d.type === 'amount_mismatch')) {
        recommendations.push('Investigate currency conversion or refund processing issues');
      }
    }

    if (Math.abs(stripeTotal - dbTotal) > 100) { // $1 tolerance for rounding
      recommendations.push('Significant amount discrepancy detected - immediate review required');
    }

    return {
      summary: {
        stripePayments: stripePayments.length,
        stripeAmount: stripeTotal,
        dbPayments: dbPayments.length,
        dbAmount: dbTotal,
        discrepancies: discrepancies.length,
      },
      discrepancies,
      recommendations,
    };
  }

  /**
   * Generate comprehensive financial report
   */
  static async generateFinancialReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeRefunds?: boolean;
      groupBy?: 'day' | 'week' | 'month';
      currency?: string;
      accountId?: string;
    } = {}
  ): Promise<{
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      averageTransactionValue: number;
      successRate: number;
      refundRate: number;
      chargebackRate: number;
    };
    breakdown: Array<{
      period: string;
      revenue: number;
      transactions: number;
      refunds: number;
      disputes: number;
    }>;
    topCustomers: Array<{
      accountId: string;
      accountName: string;
      totalSpent: number;
      transactionCount: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
  }> {
    const { includeRefunds = true, groupBy = 'day', currency = 'USD', accountId } = options;

    // Build base query conditions
    const baseConditions = [
      gte(payments.createdAt, startDate),
      lte(payments.createdAt, endDate),
      eq(payments.currency, currency),
    ];

    if (accountId) {
      baseConditions.push(eq(payments.accountId, accountId));
    }

    // Get successful payments
    const successfulPayments = await db
      .select({
        payment: payments,
        account: accounts,
        order: orders,
      })
      .from(payments)
      .leftJoin(accounts, eq(payments.accountId, accounts.id))
      .leftJoin(orders, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(payments.status, 'completed'),
          sql`${payments.amount} > 0`, // Positive amounts only
          ...baseConditions
        )
      );

    // Get refunds if requested
    let refunds: typeof successfulPayments = [];
    if (includeRefunds) {
      refunds = await db
        .select({
          payment: payments,
          account: accounts,
          order: orders,
        })
        .from(payments)
        .leftJoin(accounts, eq(payments.accountId, accounts.id))
        .leftJoin(orders, eq(payments.orderId, orders.id))
        .where(
          and(
            sql`${payments.amount} < 0`, // Negative amounts for refunds
            ...baseConditions
          )
        );
    }

    // Calculate summary metrics
    const totalRevenue = successfulPayments.reduce((sum, { payment }) => sum + payment.amount, 0);
    const totalRefunds = Math.abs(refunds.reduce((sum, { payment }) => sum + payment.amount, 0));
    const totalTransactions = successfulPayments.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Get all payment attempts for success rate calculation
    const allAttempts = await db
      .select({
        status: payments.status,
      })
      .from(payments)
      .where(and(...baseConditions));

    const successRate = allAttempts.length > 0 
      ? (successfulPayments.length / allAttempts.length) * 100 
      : 0;

    const refundRate = totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0;

    // TODO: Implement chargeback tracking
    const chargebackRate = 0; // Placeholder

    // Generate time-based breakdown
    const breakdown = this.generateTimeBreakdown(successfulPayments, refunds, groupBy, startDate, endDate);

    // Top customers analysis
    const customerSpending = new Map<string, {
      accountId: string;
      accountName: string;
      totalSpent: number;
      transactionCount: number;
    }>();

    for (const { payment, account } of successfulPayments) {
      if (account) {
        const key = account.id;
        const existing = customerSpending.get(key) || {
          accountId: account.id,
          accountName: account.companyName || account.contactName || 'Unknown',
          totalSpent: 0,
          transactionCount: 0,
        };

        existing.totalSpent += payment.amount;
        existing.transactionCount += 1;
        customerSpending.set(key, existing);
      }
    }

    const topCustomers = Array.from(customerSpending.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Payment methods breakdown
    const methodBreakdown = new Map<string, { count: number; amount: number }>();
    
    for (const { payment } of successfulPayments) {
      const method = payment.method || 'unknown';
      const existing = methodBreakdown.get(method) || { count: 0, amount: 0 };
      
      existing.count += 1;
      existing.amount += payment.amount;
      methodBreakdown.set(method, existing);
    }

    const paymentMethods = Array.from(methodBreakdown.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
      percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
    }));

    return {
      summary: {
        totalRevenue,
        totalTransactions,
        averageTransactionValue,
        successRate,
        refundRate,
        chargebackRate,
      },
      breakdown,
      topCustomers,
      paymentMethods,
    };
  }

  /**
   * Generate audit trail for a specific payment
   */
  static async generatePaymentAuditTrail(paymentId: string): Promise<{
    payment: typeof payments.$inferSelect | null;
    timeline: Array<{
      timestamp: Date;
      event: string;
      source: string;
      details: any;
      webhookId?: string;
    }>;
    relatedTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      status: string;
      createdAt: Date;
    }>;
  }> {
    // Get the payment record
    const paymentResult = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    const payment = paymentResult[0] || null;

    if (!payment) {
      return {
        payment: null,
        timeline: [],
        relatedTransactions: [],
      };
    }

    const timeline: Array<{
      timestamp: Date;
      event: string;
      source: string;
      details: any;
      webhookId?: string;
    }> = [];

    // Add payment creation event
    timeline.push({
      timestamp: payment.createdAt,
      event: 'Payment Initiated',
      source: 'system',
      details: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      },
    });

    // Get related Stripe payment intent
    if (payment.transactionId) {
      const stripePI = await db
        .select()
        .from(stripePaymentIntents)
        .where(eq(stripePaymentIntents.stripePaymentIntentId, payment.transactionId))
        .limit(1);

      if (stripePI.length > 0) {
        const pi = stripePI[0];
        
        timeline.push({
          timestamp: pi.createdAt,
          event: 'Payment Intent Created',
          source: 'stripe',
          details: {
            paymentIntentId: pi.stripePaymentIntentId,
            status: pi.status,
            clientSecret: pi.clientSecret ? '[REDACTED]' : null,
          },
        });

        if (pi.confirmedAt) {
          timeline.push({
            timestamp: pi.confirmedAt,
            event: 'Payment Confirmed',
            source: 'stripe',
            details: { paymentIntentId: pi.stripePaymentIntentId },
          });
        }

        if (pi.succeededAt) {
          timeline.push({
            timestamp: pi.succeededAt,
            event: 'Payment Succeeded',
            source: 'stripe',
            details: { 
              paymentIntentId: pi.stripePaymentIntentId,
              amountCaptured: pi.amountCaptured,
            },
          });
        }

        if (pi.canceledAt) {
          timeline.push({
            timestamp: pi.canceledAt,
            event: 'Payment Canceled',
            source: 'stripe',
            details: { 
              paymentIntentId: pi.stripePaymentIntentId,
              failureReason: pi.failureMessage,
            },
          });
        }

        // Get related webhooks
        const webhooks = await db
          .select()
          .from(stripeWebhooks)
          .where(eq(stripeWebhooks.paymentIntentId, pi.id))
          .orderBy(stripeWebhooks.createdAt);

        for (const webhook of webhooks) {
          timeline.push({
            timestamp: webhook.createdAt,
            event: `Webhook: ${webhook.eventType}`,
            source: 'stripe_webhook',
            details: {
              eventId: webhook.stripeEventId,
              status: webhook.status,
              processed: webhook.processedAt !== null,
            },
            webhookId: webhook.id,
          });
        }
      }
    }

    // Add payment completion event
    if (payment.processedAt) {
      timeline.push({
        timestamp: payment.processedAt,
        event: 'Payment Completed',
        source: 'system',
        details: {
          status: payment.status,
          recordedBy: payment.recordedBy,
        },
      });
    }

    // Get related transactions (refunds, etc.)
    const relatedTransactions = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, payment.orderId),
          sql`${payments.id} != ${paymentId}` // Exclude the main payment
        )
      )
      .orderBy(payments.createdAt);

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      payment,
      timeline,
      relatedTransactions: relatedTransactions.map(t => ({
        id: t.id,
        type: t.amount < 0 ? 'refund' : 'payment',
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Detect potentially fraudulent transactions
   */
  static async detectFraudulentActivity(
    lookbackDays: number = 7
  ): Promise<{
    suspiciousTransactions: Array<{
      paymentId: string;
      orderId: string;
      accountId: string;
      amount: number;
      riskScore: number;
      riskFactors: string[];
      createdAt: Date;
    }>;
    summary: {
      totalSuspicious: number;
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
    };
  }> {
    const startDate = subDays(new Date(), lookbackDays);
    
    const recentPayments = await db
      .select({
        payment: payments,
        account: accounts,
        order: orders,
      })
      .from(payments)
      .leftJoin(accounts, eq(payments.accountId, accounts.id))
      .leftJoin(orders, eq(payments.orderId, orders.id))
      .where(
        and(
          gte(payments.createdAt, startDate),
          eq(payments.status, 'completed')
        )
      );

    const suspiciousTransactions: Array<{
      paymentId: string;
      orderId: string;
      accountId: string;
      amount: number;
      riskScore: number;
      riskFactors: string[];
      createdAt: Date;
    }> = [];

    // Analyze each payment for risk factors
    for (const { payment, account, order } of recentPayments) {
      const riskFactors: string[] = [];
      let riskScore = 0;

      // High amount transactions
      if (payment.amount > 500000) { // $5,000+
        riskFactors.push('High transaction amount');
        riskScore += 30;
      }

      // New account (created within last 24 hours)
      if (account && Date.now() - account.createdAt.getTime() < 24 * 60 * 60 * 1000) {
        riskFactors.push('New account');
        riskScore += 25;
      }

      // Multiple rapid transactions from same account
      if (account) {
        const recentFromAccount = recentPayments.filter(
          p => p.account?.id === account.id && 
               Date.now() - p.payment.createdAt.getTime() < 60 * 60 * 1000 // Last hour
        );
        
        if (recentFromAccount.length > 3) {
          riskFactors.push('Multiple rapid transactions');
          riskScore += 20;
        }
      }

      // Round numbers (often used in testing/fraud)
      if (payment.amount % 10000 === 0 && payment.amount >= 10000) { // Round $100+ amounts
        riskFactors.push('Round amount suspicious pattern');
        riskScore += 10;
      }

      // TODO: Add more sophisticated fraud detection:
      // - Geolocation analysis
      // - Device fingerprinting
      // - Velocity checking
      // - Known fraud patterns

      // Only include transactions with risk factors
      if (riskFactors.length > 0) {
        suspiciousTransactions.push({
          paymentId: payment.id,
          orderId: payment.orderId,
          accountId: payment.accountId,
          amount: payment.amount,
          riskScore,
          riskFactors,
          createdAt: payment.createdAt,
        });
      }
    }

    // Sort by risk score (highest first)
    suspiciousTransactions.sort((a, b) => b.riskScore - a.riskScore);

    // Calculate summary
    const highRisk = suspiciousTransactions.filter(t => t.riskScore >= 50).length;
    const mediumRisk = suspiciousTransactions.filter(t => t.riskScore >= 25 && t.riskScore < 50).length;
    const lowRisk = suspiciousTransactions.filter(t => t.riskScore < 25).length;

    return {
      suspiciousTransactions,
      summary: {
        totalSuspicious: suspiciousTransactions.length,
        highRisk,
        mediumRisk,
        lowRisk,
      },
    };
  }

  // Helper methods

  private static generateTimeBreakdown(
    paymentRecords: Array<{ payment: typeof payments.$inferSelect }>,
    refundRecords: Array<{ payment: typeof payments.$inferSelect }>,
    groupBy: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Array<{
    period: string;
    revenue: number;
    transactions: number;
    refunds: number;
    disputes: number;
  }> {
    const breakdown = new Map<string, {
      revenue: number;
      transactions: number;
      refunds: number;
      disputes: number;
    }>();

    // Initialize periods
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      let periodKey: string;
      
      switch (groupBy) {
        case 'day':
          periodKey = format(currentDate, 'yyyy-MM-dd');
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'week':
          periodKey = format(currentDate, 'yyyy-[W]ww');
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
          periodKey = format(currentDate, 'yyyy-MM');
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      
      breakdown.set(periodKey, {
        revenue: 0,
        transactions: 0,
        refunds: 0,
        disputes: 0,
      });
    }

    // Add payment data
    for (const { payment } of paymentRecords) {
      let periodKey: string;
      
      switch (groupBy) {
        case 'day':
          periodKey = format(payment.createdAt, 'yyyy-MM-dd');
          break;
        case 'week':
          periodKey = format(payment.createdAt, 'yyyy-[W]ww');
          break;
        case 'month':
          periodKey = format(payment.createdAt, 'yyyy-MM');
          break;
      }
      
      const period = breakdown.get(periodKey);
      if (period) {
        period.revenue += payment.amount;
        period.transactions += 1;
      }
    }

    // Add refund data
    for (const { payment } of refundRecords) {
      let periodKey: string;
      
      switch (groupBy) {
        case 'day':
          periodKey = format(payment.createdAt, 'yyyy-MM-dd');
          break;
        case 'week':
          periodKey = format(payment.createdAt, 'yyyy-[W]ww');
          break;
        case 'month':
          periodKey = format(payment.createdAt, 'yyyy-MM');
          break;
      }
      
      const period = breakdown.get(periodKey);
      if (period) {
        period.refunds += Math.abs(payment.amount);
      }
    }

    return Array.from(breakdown.entries()).map(([period, data]) => ({
      period,
      ...data,
    }));
  }

  private static getStripeClient() {
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