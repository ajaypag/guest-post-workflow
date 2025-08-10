import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { payments, refunds } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, gte, lte, desc, or } from 'drizzle-orm';

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only account users can see their billing history
    if (session.userType !== 'account') {
      return NextResponse.json({ error: 'Only account users can access billing history' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate filter parameter
    const validFilters = ['all', 'payments', 'refunds', 'invoices'];
    if (!validFilters.includes(filter)) {
      return NextResponse.json({ error: 'Invalid filter parameter' }, { status: 400 });
    }

    // Validate date parameters
    if (startDate && !isValidDate(startDate)) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 });
    }
    if (endDate && !isValidDate(endDate)) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }
    
    // Ensure date range is reasonable (max 1 year)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const yearInMs = 365 * 24 * 60 * 60 * 1000;
      
      if (end < start) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
      }
      
      if (end.getTime() - start.getTime() > yearInMs) {
        return NextResponse.json({ error: 'Date range cannot exceed 1 year' }, { status: 400 });
      }
    }

    // Build date conditions
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(payments.processedAt, new Date(startDate)));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateConditions.push(lte(payments.processedAt, endOfDay));
    }

    // Get orders for this account
    const accountOrders = await db.query.orders.findMany({
      where: eq(orders.accountId, session.userId),
      columns: {
        id: true,
        totalRetail: true,
        state: true
      }
    });

    const orderIds = accountOrders.map(o => o.id);
    
    if (orderIds.length === 0) {
      return NextResponse.json({
        transactions: [],
        summary: {
          totalPaid: 0,
          totalRefunded: 0,
          netAmount: 0,
          transactionCount: 0
        }
      });
    }

    // Build transactions array
    const transactions = [];

    // Get payments if not filtering for refunds only
    if (filter === 'all' || filter === 'payments' || filter === 'invoices') {
      const userPayments = await db.query.payments.findMany({
        where: and(
          or(...orderIds.map(id => eq(payments.orderId, id))),
          eq(payments.status, 'completed'),
          ...(dateConditions.length > 0 ? dateConditions : [])
        ),
        with: {
          order: {
            columns: {
              id: true,
              status: true,
              state: true
            }
          }
        },
        orderBy: [desc(payments.processedAt)]
      });

      userPayments.forEach(payment => {
        // Add payment transaction
        if (filter === 'all' || filter === 'payments') {
          transactions.push({
            id: payment.id,
            type: 'payment',
            date: payment.processedAt?.toISOString() || payment.createdAt.toISOString(),
            amount: payment.amount,
            status: payment.status,
            description: `Payment for Order #${payment.orderId.substring(0, 8)}`,
            orderId: payment.orderId,
            paymentMethod: payment.paymentMethod || 'card'
          });
        }

        // Add invoice transaction if payment has invoice
        if ((filter === 'all' || filter === 'invoices') && payment.invoiceId) {
          transactions.push({
            id: payment.invoiceId,
            type: 'invoice',
            date: payment.processedAt?.toISOString() || payment.createdAt.toISOString(),
            amount: payment.amount,
            status: 'available',
            description: `Invoice for Order #${payment.orderId.substring(0, 8)}`,
            orderId: payment.orderId,
            invoiceUrl: `/api/orders/${payment.orderId}/invoice`
          });
        }
      });
    }

    // Get refunds if not filtering for payments/invoices only
    if (filter === 'all' || filter === 'refunds') {
      const userRefunds = await db.query.refunds.findMany({
        where: and(
          or(...orderIds.map(id => eq(refunds.orderId, id))),
          ...(dateConditions.length > 0 ? [
            gte(refunds.processedAt, startDate ? new Date(startDate) : new Date(0)),
            lte(refunds.processedAt, endDate ? new Date(endDate + ' 23:59:59') : new Date())
          ] : [])
        ),
        orderBy: [desc(refunds.processedAt)]
      });

      userRefunds.forEach(refund => {
        transactions.push({
          id: refund.id,
          type: 'refund',
          date: refund.processedAt?.toISOString() || refund.createdAt.toISOString(),
          amount: refund.amount,
          status: refund.status,
          description: `Refund for Order #${refund.orderId.substring(0, 8)}${refund.reason ? ` - ${refund.reason}` : ''}`,
          orderId: refund.orderId
        });
      });
    }

    // Sort transactions by date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary
    const totalPaid = transactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalRefunded = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      transactions,
      summary: {
        totalPaid,
        totalRefunded,
        netAmount: totalPaid - totalRefunded,
        transactionCount: transactions.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}