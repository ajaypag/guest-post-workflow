import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, isNull, or, and, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check auth - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find orders that have line items but no estimated price per link
    const ordersToFix = await db.query.orders.findMany({
      where: or(
        isNull(orders.estimatedPricePerLink),
        eq(orders.estimatedPricePerLink, 0)
      )
    });

    console.log(`Found ${ordersToFix.length} orders to fix`);

    const results = [];
    
    for (const order of ordersToFix) {
      try {
        // Get active line items for this order (exclude cancelled items from price calculations)
        const lineItems = await db.query.orderLineItems.findMany({
          where: and(
            eq(orderLineItems.orderId, order.id),
            sql`${orderLineItems.status} NOT IN ('cancelled', 'refunded')`,
            sql`${orderLineItems.cancelledAt} IS NULL`
          )
        });

        if (lineItems.length === 0) {
          results.push({
            orderId: order.id,
            status: 'skipped',
            reason: 'No line items'
          });
          continue;
        }

        // Calculate average estimated price
        let totalEstimatedPrice = 0;
        let totalApprovedPrice = 0;
        let itemsWithEstimatedPrice = 0;
        let itemsWithApprovedPrice = 0;

        lineItems.forEach(item => {
          if (item.estimatedPrice && item.estimatedPrice > 0) {
            totalEstimatedPrice += item.estimatedPrice;
            itemsWithEstimatedPrice++;
          }
          if (item.approvedPrice && item.approvedPrice > 0) {
            totalApprovedPrice += item.approvedPrice;
            itemsWithApprovedPrice++;
          }
        });

        // Use approved price if available, otherwise use estimated price
        let pricePerLink = null;
        if (itemsWithApprovedPrice > 0) {
          pricePerLink = Math.round(totalApprovedPrice / itemsWithApprovedPrice);
        } else if (itemsWithEstimatedPrice > 0) {
          pricePerLink = Math.round(totalEstimatedPrice / itemsWithEstimatedPrice);
        }

        if (pricePerLink && pricePerLink > 0) {
          // Update the order
          await db.update(orders)
            .set({ 
              estimatedPricePerLink: pricePerLink,
              updatedAt: new Date()
            })
            .where(eq(orders.id, order.id));

          results.push({
            orderId: order.id,
            status: 'updated',
            pricePerLink: pricePerLink,
            itemCount: lineItems.length,
            calculation: itemsWithApprovedPrice > 0 ? 'approved' : 'estimated'
          });
        } else {
          results.push({
            orderId: order.id,
            status: 'skipped',
            reason: 'No pricing data available'
          });
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.push({
          orderId: order.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      total: ordersToFix.length,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    };

    return NextResponse.json({
      success: true,
      summary,
      results
    });

  } catch (error) {
    console.error('Error fixing price per link:', error);
    return NextResponse.json(
      { error: 'Failed to fix price per link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check auth - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get count of orders that need fixing
    const ordersToFix = await db.query.orders.findMany({
      where: or(
        isNull(orders.estimatedPricePerLink),
        eq(orders.estimatedPricePerLink, 0)
      ),
      columns: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      needsFixing: ordersToFix.length,
      orders: ordersToFix.slice(0, 10) // Show first 10 as preview
    });

  } catch (error) {
    console.error('Error checking price per link status:', error);
    return NextResponse.json(
      { error: 'Failed to check price per link status' },
      { status: 500 }
    );
  }
}