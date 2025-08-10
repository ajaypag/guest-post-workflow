import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { stripePaymentIntents, payments } from '@/lib/db/paymentSchema';
import { eq, and, gte, lte, sql, isNull, or } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const checkStripe = searchParams.get('checkStripe') === 'true';

    // Build date filter
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(gte(stripePaymentIntents.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      dateFilter.push(lte(stripePaymentIntents.createdAt, endDateTime));
    }

    // Get all payment intents from database
    const dbPaymentIntents = await db
      .select({
        id: stripePaymentIntents.id,
        orderId: stripePaymentIntents.orderId,
        stripePaymentIntentId: stripePaymentIntents.stripePaymentIntentId,
        amount: stripePaymentIntents.amount,
        currency: stripePaymentIntents.currency,
        status: stripePaymentIntents.status,
        createdAt: stripePaymentIntents.createdAt,
        order: {
          id: orders.id,
          state: orders.state,
          status: orders.status,
          totalRetail: orders.totalRetail,
          paidAt: orders.paidAt
        }
      })
      .from(stripePaymentIntents)
      .leftJoin(orders, eq(stripePaymentIntents.orderId, orders.id))
      .where(dateFilter.length > 0 ? and(...dateFilter) : undefined)
      .orderBy(sql`${stripePaymentIntents.createdAt} DESC`);

    // Get all payments from database
    const dbPayments = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        status: payments.status,
        stripePaymentIntentId: payments.stripePaymentIntentId,
        processedAt: payments.processedAt
      })
      .from(payments)
      .where(dateFilter.length > 0 ? and(
        startDate ? gte(payments.processedAt, new Date(startDate)) : undefined,
        endDate ? lte(payments.processedAt, new Date(endDate + 'T23:59:59.999Z')) : undefined
      ) : undefined);

    const reconciliation = {
      summary: {
        totalPaymentIntents: dbPaymentIntents.length,
        totalPayments: dbPayments.length,
        totalExpectedRevenue: 0,
        totalRecordedRevenue: 0,
        discrepancies: [] as any[]
      },
      paymentIntents: [] as any[],
      stripeComparison: null as any
    };

    // Process payment intents
    for (const pi of dbPaymentIntents) {
      const payment = dbPayments.find(p => p.stripePaymentIntentId === pi.stripePaymentIntentId);
      const order = pi.order;

      const record = {
        paymentIntentId: pi.stripePaymentIntentId,
        orderId: pi.orderId,
        amount: pi.amount,
        currency: pi.currency,
        dbStatus: pi.status,
        stripeStatus: null as string | null,
        hasPaymentRecord: !!payment,
        paymentAmount: payment?.amount || null,
        paymentStatus: payment?.status || null,
        orderState: order?.state || 'unknown',
        orderStatus: order?.status || 'unknown',
        orderPaidAt: order?.paidAt || null,
        orderTotal: order?.totalRetail || null,
        createdAt: pi.createdAt,
        issues: [] as string[]
      };

      // Check for discrepancies
      if (pi.status === 'succeeded' && !payment) {
        record.issues.push('Payment intent succeeded but no payment record');
      }

      if (payment && payment.amount !== pi.amount) {
        record.issues.push(`Payment amount mismatch: ${payment.amount} vs ${pi.amount}`);
      }

      if (order && pi.status === 'succeeded' && order.state !== 'payment_received' && !order.paidAt) {
        record.issues.push('Payment succeeded but order not marked as paid');
      }

      if (order && order.totalRetail !== pi.amount) {
        record.issues.push(`Order total mismatch: ${order.totalRetail} vs ${pi.amount}`);
      }

      if (pi.status === 'succeeded') {
        reconciliation.summary.totalExpectedRevenue += pi.amount;
      }

      if (payment && payment.status === 'completed') {
        reconciliation.summary.totalRecordedRevenue += payment.amount;
      }

      if (record.issues.length > 0) {
        reconciliation.summary.discrepancies.push({
          paymentIntentId: pi.stripePaymentIntentId,
          issues: record.issues
        });
      }

      reconciliation.paymentIntents.push(record);
    }

    // Check Stripe if requested
    if (checkStripe && reconciliation.paymentIntents.length > 0) {
      try {
        const stripeData = {
          checked: 0,
          mismatches: [] as any[]
        };

        // Check up to 10 payment intents against Stripe
        const intentIdsToCheck = reconciliation.paymentIntents
          .slice(0, 10)
          .map(pi => pi.paymentIntentId);

        for (const intentId of intentIdsToCheck) {
          try {
            const stripePI = await stripe.paymentIntents.retrieve(intentId);
            const dbRecord = reconciliation.paymentIntents.find(pi => pi.paymentIntentId === intentId);
            
            if (dbRecord) {
              dbRecord.stripeStatus = stripePI.status;
              stripeData.checked++;

              if (dbRecord.dbStatus !== stripePI.status) {
                stripeData.mismatches.push({
                  paymentIntentId: intentId,
                  dbStatus: dbRecord.dbStatus,
                  stripeStatus: stripePI.status
                });
                dbRecord.issues.push(`Status mismatch with Stripe: DB=${dbRecord.dbStatus}, Stripe=${stripePI.status}`);
              }

              if (dbRecord.amount !== stripePI.amount) {
                stripeData.mismatches.push({
                  paymentIntentId: intentId,
                  dbAmount: dbRecord.amount,
                  stripeAmount: stripePI.amount
                });
                dbRecord.issues.push(`Amount mismatch with Stripe: DB=${dbRecord.amount}, Stripe=${stripePI.amount}`);
              }
            }
          } catch (stripeError) {
            console.error(`Failed to fetch Stripe payment intent ${intentId}:`, stripeError);
          }
        }

        reconciliation.stripeComparison = stripeData;
      } catch (error) {
        console.error('Stripe comparison failed:', error);
      }
    }

    // Find orphaned payments (payments without payment intent records)
    const orphanedPayments = dbPayments.filter(p => 
      !dbPaymentIntents.find(pi => pi.stripePaymentIntentId === p.stripePaymentIntentId)
    );

    if (orphanedPayments.length > 0) {
      reconciliation.summary.discrepancies.push({
        type: 'orphaned_payments',
        count: orphanedPayments.length,
        totalAmount: orphanedPayments.reduce((sum, p) => sum + p.amount, 0),
        paymentIds: orphanedPayments.map(p => p.id)
      });
    }

    return NextResponse.json({
      reconciliation,
      timestamp: new Date().toISOString(),
      dateRange: {
        start: startDate || 'all',
        end: endDate || 'all'
      }
    });

  } catch (error: any) {
    console.error('Error in payment reconciliation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconcile payments' },
      { status: 500 }
    );
  }
}

// POST endpoint to fix discrepancies
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, paymentIntentId, orderId } = body;

    if (action === 'sync_from_stripe') {
      // Sync payment intent status from Stripe
      const stripePI = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      await db
        .update(stripePaymentIntents)
        .set({
          status: stripePI.status,
          updatedAt: new Date()
        })
        .where(eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId));

      // If succeeded, ensure payment record exists
      if (stripePI.status === 'succeeded') {
        const existingPayment = await db.query.payments.findFirst({
          where: eq(payments.stripePaymentIntentId, paymentIntentId)
        });

        if (!existingPayment) {
          // Create payment record
          const paymentIntentRecord = await db.query.stripePaymentIntents.findFirst({
            where: eq(stripePaymentIntents.stripePaymentIntentId, paymentIntentId)
          });

          if (paymentIntentRecord) {
            await db.insert(payments).values({
              orderId: paymentIntentRecord.orderId,
              amount: stripePI.amount,
              currency: stripePI.currency.toUpperCase(),
              status: 'completed',
              provider: 'stripe',
              stripePaymentIntentId: paymentIntentId,
              metadata: {
                customerId: stripePI.customer as string,
                paymentMethodId: stripePI.payment_method as string
              },
              processedAt: new Date()
            });
          }
        }

        // Update order status
        if (orderId) {
          await db
            .update(orders)
            .set({
              state: 'payment_received',
              status: 'paid',
              paidAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Synced from Stripe successfully' 
      });
    }

    if (action === 'mark_order_paid') {
      // Mark order as paid based on successful payment intent
      await db
        .update(orders)
        .set({
          state: 'payment_received',
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      return NextResponse.json({ 
        success: true, 
        message: 'Order marked as paid' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error fixing payment discrepancy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fix discrepancy' },
      { status: 500 }
    );
  }
}