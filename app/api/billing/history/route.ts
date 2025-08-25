import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { stripeCheckoutSessions } from '@/lib/db/paymentSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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

    // Get orders for this account
    const accountOrders = await db
      .select({
        id: orders.id,
        totalRetail: orders.totalRetail,
        state: orders.state,
        orderType: orders.orderType,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(eq(orders.accountId, session.userId));

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

    // Build date conditions for checkout sessions
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(stripeCheckoutSessions.completedAt, new Date(startDate)));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateConditions.push(lte(stripeCheckoutSessions.completedAt, endOfDay));
    }

    // Get completed checkout sessions (these are successful payments)
    const checkoutSessions = await db
      .select({
        sessionId: stripeCheckoutSessions.id,
        stripeSessionId: stripeCheckoutSessions.stripeSessionId,
        orderId: stripeCheckoutSessions.orderId,
        status: stripeCheckoutSessions.status,
        amountTotal: stripeCheckoutSessions.amountTotal,
        currency: stripeCheckoutSessions.currency,
        completedAt: stripeCheckoutSessions.completedAt,
        createdAt: stripeCheckoutSessions.createdAt,
        paymentIntentId: stripeCheckoutSessions.paymentIntentId,
      })
      .from(stripeCheckoutSessions)
      .where(
        and(
          sql`${stripeCheckoutSessions.orderId} = ANY(ARRAY[${sql.raw(orderIds.map(id => `'${id}'::uuid`).join(','))}])`,
          eq(stripeCheckoutSessions.status, 'complete'),
          ...(dateConditions.length > 0 ? dateConditions : [])
        )
      )
      .orderBy(desc(stripeCheckoutSessions.completedAt));

    // Build transactions array
    const transactions: any[] = [];

    // Map completed checkout sessions to payment transactions
    if (filter === 'all' || filter === 'payments') {
      checkoutSessions.forEach(session => {
        const order = accountOrders.find(o => o.id === session.orderId);
        transactions.push({
          id: session.sessionId,
          type: 'payment',
          date: session.completedAt?.toISOString() || session.createdAt.toISOString(),
          amount: session.amountTotal,
          status: 'completed',
          description: `Payment for ${order?.orderType?.replace('_', ' ') || 'Order'} #${session.orderId.substring(0, 8)}`,
          orderId: session.orderId,
          paymentMethod: 'card',
          stripePaymentIntentId: session.paymentIntentId,
          stripeSessionId: session.stripeSessionId,
          receiptAvailable: !!session.paymentIntentId,
        });
      });
    }

    // Add invoices for completed payments (if filtering for invoices)
    if (filter === 'all' || filter === 'invoices') {
      checkoutSessions.forEach(session => {
        const order = accountOrders.find(o => o.id === session.orderId);
        transactions.push({
          id: `inv_${session.sessionId}`,
          type: 'invoice',
          date: session.completedAt?.toISOString() || session.createdAt.toISOString(),
          amount: session.amountTotal,
          status: 'available',
          description: `Invoice for ${order?.orderType?.replace('_', ' ') || 'Order'} #${session.orderId.substring(0, 8)}`,
          orderId: session.orderId,
          invoiceUrl: `/api/orders/${session.orderId}/invoice`,
        });
      });
    }

    // Note: Refunds are not yet implemented in the new Stripe Checkout flow
    // When refunds are implemented, they will be added here
    if (filter === 'refunds') {
      // Currently no refunds in the system
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
        transactionCount: transactions.filter(t => t.type === 'payment').length
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