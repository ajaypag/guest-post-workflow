import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { clients } from '@/lib/db/schema';
import { publisherEarnings } from '@/lib/db/publisherEarningsSchema';
import { publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * GET /api/publisher/orders
 * Get orders assigned to the logged-in publisher
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate publisher
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // Filter by publisher_status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(orderLineItems.publisherId, session.publisherId!)];
    
    if (status) {
      conditions.push(eq(orderLineItems.publisherStatus, status));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderLineItems)
      .where(and(...conditions));

    const totalCount = countResult[0]?.count || 0;

    // Get orders with related data - select only specific fields to avoid missing columns
    const publisherOrders = await db
      .select({
        lineItem: {
          id: orderLineItems.id,
          orderId: orderLineItems.orderId,
          clientId: orderLineItems.clientId,
          targetPageUrl: orderLineItems.targetPageUrl,
          anchorText: orderLineItems.anchorText,
          status: orderLineItems.status,
          assignedDomain: orderLineItems.assignedDomain,
          publisherId: orderLineItems.publisherId,
          publisherOfferingId: orderLineItems.publisherOfferingId,
          publisherStatus: orderLineItems.publisherStatus,
          publisherPrice: orderLineItems.publisherPrice,
          platformFee: orderLineItems.platformFee,
          publisherNotifiedAt: orderLineItems.publisherNotifiedAt,
          publisherAcceptedAt: orderLineItems.publisherAcceptedAt,
          publisherSubmittedAt: orderLineItems.publisherSubmittedAt,
          workflowId: orderLineItems.workflowId,
          publishedUrl: orderLineItems.publishedUrl,
          deliveredAt: orderLineItems.deliveredAt
        },
        order: {
          id: orders.id,
          status: orders.status
        },
        client: {
          id: clients.id,
          name: clients.name
        },
        offering: {
          id: publisherOfferings.id,
          offeringName: publisherOfferings.offeringName,
          offeringType: publisherOfferings.offeringType,
          turnaroundDays: publisherOfferings.turnaroundDays
        },
        earnings: {
          id: publisherEarnings.id,
          amount: publisherEarnings.netAmount,
          status: publisherEarnings.status,
          paidAt: publisherEarnings.paidAt
        }
      })
      .from(orderLineItems)
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
      .leftJoin(publisherOfferings, eq(orderLineItems.publisherOfferingId, publisherOfferings.id))
      .leftJoin(
        publisherEarnings,
        eq(publisherEarnings.orderLineItemId, orderLineItems.id)
      )
      .where(and(...conditions))
      .orderBy(desc(orderLineItems.id))
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedOrders = publisherOrders.map(row => ({
      id: row.lineItem.id,
      orderId: row.lineItem.orderId,
      clientName: row.client?.name || 'Unknown Client',
      targetPageUrl: row.lineItem.targetPageUrl,
      anchorText: row.lineItem.anchorText,
      domain: row.lineItem.assignedDomain,
      
      // Publisher-specific fields
      publisherStatus: row.lineItem.publisherStatus,
      publisherPrice: row.lineItem.publisherPrice,
      platformFee: row.lineItem.platformFee,
      netEarnings: row.lineItem.publisherPrice && row.lineItem.platformFee 
        ? row.lineItem.publisherPrice - row.lineItem.platformFee 
        : null,
      
      // Dates
      notifiedAt: row.lineItem.publisherNotifiedAt,
      acceptedAt: row.lineItem.publisherAcceptedAt,
      submittedAt: row.lineItem.publisherSubmittedAt,
      
      // Earnings info
      earnings: row.earnings ? {
        id: row.earnings.id,
        amount: row.earnings.amount,
        status: row.earnings.status,
        paidAt: row.earnings.paidAt
      } : null,
      
      // Offering details
      offeringType: row.offering?.offeringType,
      turnaroundDays: row.offering?.turnaroundDays,
      
      // General status
      overallStatus: row.lineItem.status,
      createdAt: row.lineItem.publisherNotifiedAt || new Date()
    }));

    // Get summary statistics using conditional aggregation (compatible with older PostgreSQL)
    const stats = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        pendingOrders: sql<number>`SUM(CASE WHEN publisher_status IN ('pending', 'notified') THEN 1 ELSE 0 END)`,
        inProgressOrders: sql<number>`SUM(CASE WHEN publisher_status IN ('accepted', 'in_progress', 'submitted') THEN 1 ELSE 0 END)`,
        completedOrders: sql<number>`SUM(CASE WHEN publisher_status = 'completed' THEN 1 ELSE 0 END)`,
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN publisher_status = 'completed' THEN publisher_price - platform_fee ELSE 0 END), 0)`
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.publisherId, session.publisherId!));

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: stats[0] || {
        totalOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        totalEarnings: 0
      }
    });

  } catch (error) {
    console.error('Error fetching publisher orders:', error);
    console.error('Stack trace:', (error as any).stack);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: (error as any).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/publisher/orders
 * Update order status (accept/reject/submit)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate publisher
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lineItemId, action, data } = await request.json();

    if (!lineItemId || !action) {
      return NextResponse.json(
        { error: 'Line item ID and action are required' },
        { status: 400 }
      );
    }

    // Verify the line item belongs to this publisher
    const lineItem = await db.query.orderLineItems.findFirst({
      where: and(
        eq(orderLineItems.id, lineItemId),
        eq(orderLineItems.publisherId, session.publisherId!)
      )
    });

    if (!lineItem) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // Handle different actions
    let updateData: any = {};
    
    switch (action) {
      case 'accept':
        if (lineItem.publisherStatus !== 'pending' && lineItem.publisherStatus !== 'notified') {
          return NextResponse.json(
            { error: 'Order cannot be accepted in current state' },
            { status: 400 }
          );
        }
        updateData = {
          publisherStatus: 'accepted',
          publisherAcceptedAt: new Date()
        };
        break;

      case 'reject':
        if (lineItem.publisherStatus !== 'pending' && lineItem.publisherStatus !== 'notified') {
          return NextResponse.json(
            { error: 'Order cannot be rejected in current state' },
            { status: 400 }
          );
        }
        updateData = {
          publisherStatus: 'rejected',
          metadata: {
            ...lineItem.metadata,
            rejectionReason: data?.reason,
            rejectedAt: new Date().toISOString()
          }
        };
        break;

      case 'start':
        if (lineItem.publisherStatus !== 'accepted') {
          return NextResponse.json(
            { error: 'Order must be accepted before starting' },
            { status: 400 }
          );
        }
        updateData = {
          publisherStatus: 'in_progress'
        };
        break;

      case 'submit':
        if (lineItem.publisherStatus !== 'in_progress' && lineItem.publisherStatus !== 'accepted') {
          return NextResponse.json(
            { error: 'Order must be in progress to submit' },
            { status: 400 }
          );
        }
        
        if (!data?.publishedUrl) {
          return NextResponse.json(
            { error: 'Published URL is required' },
            { status: 400 }
          );
        }
        
        updateData = {
          publisherStatus: 'submitted',
          publisherSubmittedAt: new Date(),
          publishedUrl: data.publishedUrl,
          deliveryNotes: data.notes
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update the line item
    updateData.modifiedAt = new Date();
    updateData.modifiedBy = session.userId;

    await db
      .update(orderLineItems)
      .set(updateData)
      .where(eq(orderLineItems.id, lineItemId));

    return NextResponse.json({
      success: true,
      message: `Order ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error updating publisher order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}