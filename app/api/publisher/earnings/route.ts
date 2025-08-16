import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherEarnings, publisherPaymentBatches } from '@/lib/db/publisherEarningsSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { clients } from '@/lib/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/publisher/earnings
 * Get earnings data for the logged-in publisher
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate publisher
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // Filter by earnings status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query conditions
    const conditions = [eq(publisherEarnings.publisherId, session.publisherId!)];
    
    if (status) {
      conditions.push(eq(publisherEarnings.status, status));
    }
    
    if (startDate) {
      conditions.push(gte(publisherEarnings.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(publisherEarnings.createdAt, new Date(endDate)));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(publisherEarnings)
      .where(and(...conditions));

    const totalCount = countResult[0]?.count || 0;

    // Get earnings with related data
    const earnings = await db
      .select({
        earning: publisherEarnings,
        lineItem: orderLineItems,
        order: orders,
        client: clients,
        paymentBatch: {
          id: publisherPaymentBatches.id,
          batchNumber: publisherPaymentBatches.batchNumber,
          paidAt: publisherPaymentBatches.paidAt,
          status: publisherPaymentBatches.status
        }
      })
      .from(publisherEarnings)
      .leftJoin(orderLineItems, eq(publisherEarnings.orderLineItemId, orderLineItems.id))
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .leftJoin(publisherPaymentBatches, eq(publisherEarnings.paymentBatchId, publisherPaymentBatches.id))
      .where(and(...conditions))
      .orderBy(desc(publisherEarnings.createdAt))
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedEarnings = earnings.map(row => ({
      id: row.earning.id,
      amount: row.earning.amount,
      netAmount: row.earning.netAmount,
      grossAmount: row.earning.grossAmount,
      platformFeeAmount: row.earning.platformFeeAmount,
      platformFeePercent: row.earning.platformFeePercent,
      currency: row.earning.currency,
      status: row.earning.status,
      earningType: row.earning.earningType,
      description: row.earning.description,
      confirmedAt: row.earning.confirmedAt,
      paidAt: row.earning.paidAt,
      
      // Order details
      orderInfo: row.lineItem && row.order && row.client ? {
        orderId: row.order.id,
        clientName: row.client.name,
        targetPageUrl: row.lineItem.targetPageUrl,
        anchorText: row.lineItem.anchorText,
        domain: row.lineItem.assignedDomain
      } : null,
      
      // Payment info
      paymentInfo: row.paymentBatch ? {
        batchId: row.paymentBatch.id,
        batchNumber: row.paymentBatch.batchNumber,
        paidAt: row.paymentBatch.paidAt,
        batchStatus: row.paymentBatch.status
      } : null,
      
      createdAt: row.earning.createdAt
    }));

    // Get summary statistics
    const stats = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(net_amount), 0)`,
        pendingEarnings: sql<number>`COALESCE(SUM(net_amount) FILTER (WHERE status IN ('pending', 'confirmed')), 0)`,
        paidEarnings: sql<number>`COALESCE(SUM(net_amount) FILTER (WHERE status = 'paid'), 0)`,
        thisMonthEarnings: sql<number>`COALESCE(SUM(net_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)`,
        totalOrders: sql<number>`COUNT(DISTINCT order_line_item_id)`,
        avgOrderValue: sql<number>`COALESCE(AVG(net_amount), 0)`
      })
      .from(publisherEarnings)
      .where(eq(publisherEarnings.publisherId, session.publisherId!));

    // Get monthly earnings for chart data
    const monthlyEarnings = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        earnings: sql<number>`COALESCE(SUM(net_amount), 0)`,
        orders: sql<number>`COUNT(DISTINCT order_line_item_id)`
      })
      .from(publisherEarnings)
      .where(
        and(
          eq(publisherEarnings.publisherId, session.publisherId!),
          gte(publisherEarnings.createdAt, sql`CURRENT_DATE - INTERVAL '12 months'`)
        )
      )
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    return NextResponse.json({
      earnings: formattedEarnings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: stats[0] || {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        thisMonthEarnings: 0,
        totalOrders: 0,
        avgOrderValue: 0
      },
      monthlyEarnings
    });

  } catch (error) {
    console.error('Error fetching publisher earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/publisher/earnings/export
 * Export earnings data as CSV
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate publisher
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, status } = await request.json();

    // Build query conditions
    const conditions = [eq(publisherEarnings.publisherId, session.publisherId!)];
    
    if (status) {
      conditions.push(eq(publisherEarnings.status, status));
    }
    
    if (startDate) {
      conditions.push(gte(publisherEarnings.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(publisherEarnings.createdAt, new Date(endDate)));
    }

    // Get all earnings for export
    const earnings = await db
      .select({
        earning: publisherEarnings,
        lineItem: orderLineItems,
        order: orders,
        client: clients
      })
      .from(publisherEarnings)
      .leftJoin(orderLineItems, eq(publisherEarnings.orderLineItemId, orderLineItems.id))
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(publisherEarnings.createdAt));

    // Format for CSV
    const csvData = earnings.map(row => ({
      'Earning ID': row.earning.id,
      'Date': row.earning.createdAt?.toISOString().split('T')[0],
      'Type': row.earning.earningType,
      'Order ID': row.order?.id || '',
      'Client': row.client?.name || '',
      'Domain': row.lineItem?.assignedDomain || '',
      'Gross Amount': (row.earning.grossAmount || 0) / 100,
      'Platform Fee': (row.earning.platformFeeAmount || 0) / 100,
      'Net Amount': (row.earning.netAmount || 0) / 100,
      'Status': row.earning.status,
      'Paid Date': row.earning.paidAt?.toISOString().split('T')[0] || '',
      'Description': row.earning.description || ''
    }));

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
      )
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="earnings-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting earnings:', error);
    return NextResponse.json(
      { error: 'Failed to export earnings' },
      { status: 500 }
    );
  }
}