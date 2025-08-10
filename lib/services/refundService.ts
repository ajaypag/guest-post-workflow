import Stripe from 'stripe';
import { db } from '@/lib/db/connection';
import { payments, refunds } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, desc } from 'drizzle-orm';
import { EmailService } from './emailService';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export interface RefundRequest {
  orderId: string;
  amount?: number; // Amount in cents. If not provided, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  notes?: string;
  initiatedBy: string; // User ID
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  stripeRefundId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export class RefundService {
  /**
   * Process a refund for an order
   */
  static async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      const { orderId, amount, reason = 'requested_by_customer', notes, initiatedBy } = request;

      // Get the order
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Check if order is eligible for refund
      if (order.state !== 'payment_received' && order.state !== 'in_progress' && order.state !== 'completed') {
        return { 
          success: false, 
          error: `Order cannot be refunded in current state: ${order.state}` 
        };
      }

      // Get the payment record
      const payment = await db.query.payments.findFirst({
        where: and(
          eq(payments.orderId, orderId),
          eq(payments.status, 'completed')
        ),
        orderBy: [desc(payments.processedAt)]
      });

      if (!payment) {
        return { success: false, error: 'No completed payment found for this order' };
      }

      if (!payment.stripePaymentIntentId) {
        return { success: false, error: 'Payment does not have a Stripe payment intent' };
      }

      // Calculate refund amount
      const refundAmount = amount || payment.amount;
      
      // Check if amount is valid
      if (refundAmount > payment.amount) {
        return { 
          success: false, 
          error: `Refund amount ($${refundAmount / 100}) exceeds payment amount ($${payment.amount / 100})` 
        };
      }

      // Check for existing refunds to prevent exceeding original payment
      const existingRefunds = await db.query.refunds.findMany({
        where: eq(refunds.paymentId, payment.id)
      });

      const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
      if (totalRefunded + refundAmount > payment.amount) {
        return { 
          success: false, 
          error: `Total refunds would exceed payment amount. Already refunded: $${totalRefunded / 100}` 
        };
      }

      // Create Stripe refund
      let stripeRefund: Stripe.Refund;
      try {
        stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: refundAmount,
          reason: reason as Stripe.RefundCreateParams.Reason,
          metadata: {
            orderId,
            initiatedBy,
            notes: notes || ''
          }
        });
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError);
        return { 
          success: false, 
          error: `Stripe error: ${stripeError.message}` 
        };
      }

      // Save refund record to database
      const [refundRecord] = await db.insert(refunds).values({
        paymentId: payment.id,
        orderId,
        stripeRefundId: stripeRefund.id,
        amount: refundAmount,
        currency: payment.currency,
        status: stripeRefund.status || 'pending',
        reason,
        notes,
        initiatedBy,
        metadata: {
          stripeResponse: stripeRefund
        },
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Update order state if fully refunded
      const isFullRefund = (totalRefunded + refundAmount) === payment.amount;
      if (isFullRefund) {
        await db.update(orders)
          .set({
            state: 'refunded',
            refundedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
      } else {
        // Partial refund - update order to reflect partial refund state
        await db.update(orders)
          .set({
            state: 'partially_refunded',
            partialRefundAmount: totalRefunded + refundAmount,
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
      }

      // Send refund confirmation email
      try {
        const account = order.accountId ? await db.query.accounts.findFirst({
          where: eq(accounts.id, order.accountId)
        }) : null;

        if (account) {
          await EmailService.sendRefundConfirmationEmail({
            to: account.email,
            orderId,
            refundAmount,
            isFullRefund,
            orderViewUrl: `${process.env.NEXTAUTH_URL}/orders/${orderId}`
          });
        }
      } catch (emailError) {
        console.error('Failed to send refund email:', emailError);
        // Don't fail the refund if email fails
      }

      return {
        success: true,
        refundId: refundRecord.id,
        stripeRefundId: stripeRefund.id,
        amount: refundAmount,
        status: stripeRefund.status
      };

    } catch (error: any) {
      console.error('Refund processing error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to process refund' 
      };
    }
  }

  /**
   * Get refund history for an order
   */
  static async getRefundHistory(orderId: string) {
    const refundRecords = await db.query.refunds.findMany({
      where: eq(refunds.orderId, orderId),
      orderBy: [desc(refunds.processedAt)]
    });

    return refundRecords;
  }

  /**
   * Check refund status from Stripe
   */
  static async checkRefundStatus(stripeRefundId: string) {
    try {
      const stripeRefund = await stripe.refunds.retrieve(stripeRefundId);
      
      // Update our database with current status
      await db.update(refunds)
        .set({
          status: stripeRefund.status || 'unknown',
          failureReason: stripeRefund.failure_reason,
          updatedAt: new Date()
        })
        .where(eq(refunds.stripeRefundId, stripeRefundId));

      return {
        status: stripeRefund.status,
        failureReason: stripeRefund.failure_reason,
        amount: stripeRefund.amount,
        currency: stripeRefund.currency
      };
    } catch (error: any) {
      console.error('Error checking refund status:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending refund (if possible)
   */
  static async cancelRefund(refundId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const refundRecord = await db.query.refunds.findFirst({
        where: eq(refunds.id, refundId)
      });

      if (!refundRecord) {
        return { success: false, error: 'Refund not found' };
      }

      if (refundRecord.status !== 'pending') {
        return { success: false, error: `Cannot cancel refund with status: ${refundRecord.status}` };
      }

      // Try to cancel with Stripe
      try {
        await stripe.refunds.cancel(refundRecord.stripeRefundId);
      } catch (stripeError: any) {
        // If Stripe says it's already succeeded or failed, update our records
        if (stripeError.code === 'refund_already_completed') {
          await db.update(refunds)
            .set({ status: 'succeeded', updatedAt: new Date() })
            .where(eq(refunds.id, refundId));
          return { success: false, error: 'Refund has already been completed' };
        }
        throw stripeError;
      }

      // Update database
      await db.update(refunds)
        .set({
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(refunds.id, refundId));

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling refund:', error);
      return { success: false, error: error.message || 'Failed to cancel refund' };
    }
  }
}