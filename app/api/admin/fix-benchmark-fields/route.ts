import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { eq, or, isNull, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check auth - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find orders that are missing critical benchmark fields
    const ordersToFix = await db.query.orders.findMany({
      where: or(
        isNull(orders.totalRetail),
        eq(orders.totalRetail, 0),
        isNull(orders.subtotalRetail),
        eq(orders.subtotalRetail, 0)
      )
    });

    console.log(`Found ${ordersToFix.length} orders to fix`);

    const results = [];
    
    for (const order of ordersToFix) {
      try {
        // Get line items for this order
        const lineItems = await db.query.orderLineItems.findMany({
          where: eq(orderLineItems.orderId, order.id)
        });

        if (lineItems.length === 0) {
          results.push({
            orderId: order.id,
            status: 'skipped',
            reason: 'No line items'
          });
          continue;
        }

        // Calculate all the missing fields
        let subtotalRetail = 0;
        let totalRetail = 0;
        let totalWholesale = 0;
        let totalEstimatedPrice = 0;
        let totalApprovedPrice = 0;
        let itemsWithPrice = 0;
        let minDr: number | null = null;
        let maxDr: number | null = null;
        let minTraffic: number | null = null;

        lineItems.forEach(item => {
          // Use approved price if available, otherwise estimated price
          const itemPrice = item.approvedPrice || item.estimatedPrice || 0;
          
          if (itemPrice > 0) {
            totalEstimatedPrice += item.estimatedPrice || 0;
            totalApprovedPrice += item.approvedPrice || 0;
            subtotalRetail += itemPrice;
            totalRetail += itemPrice;
            itemsWithPrice++;
            
            // Calculate wholesale (subtract service fee)
            const wholesalePrice = Math.max(itemPrice - 7900, 0);
            totalWholesale += wholesalePrice;
          }
          
          // Extract DR and traffic from metadata
          const metadata = item.metadata as any;
          if (metadata) {
            if (metadata.domainRating) {
              const dr = metadata.domainRating;
              if (minDr === null || dr < minDr) minDr = dr;
              if (maxDr === null || dr > maxDr) maxDr = dr;
            }
            if (metadata.totalTraffic) {
              const traffic = metadata.totalTraffic;
              if (minTraffic === null || traffic < minTraffic) minTraffic = traffic;
            }
          }
        });

        // Calculate derived fields
        const estimatedPricePerLink = itemsWithPrice > 0 
          ? Math.round(totalRetail / itemsWithPrice)
          : null;
          
        const profitMargin = totalRetail > 0 
          ? Math.round(((totalRetail - totalWholesale) / totalRetail) * 10000) / 100
          : 0;

        // Prepare update data
        const updateData: any = {
          updatedAt: new Date()
        };

        // Always update pricing fields
        if (totalRetail > 0 || order.totalRetail === null || order.totalRetail === 0) {
          updateData.subtotalRetail = subtotalRetail;
          updateData.totalRetail = totalRetail;
          updateData.totalWholesale = totalWholesale;
          updateData.profitMargin = profitMargin;
        }

        // Update price per link if missing
        if (!order.estimatedPricePerLink && estimatedPricePerLink) {
          updateData.estimatedPricePerLink = estimatedPricePerLink;
        }

        // Update DR range if missing
        if (!order.preferencesDrMin && minDr !== null) {
          updateData.preferencesDrMin = minDr;
        }
        if (!order.preferencesDrMax && maxDr !== null) {
          updateData.preferencesDrMax = maxDr;
        }

        // Update traffic min if missing
        if (!order.preferencesTrafficMin && minTraffic !== null) {
          updateData.preferencesTrafficMin = minTraffic;
        }

        // Update budget estimates if missing
        if (!order.estimatedBudgetMin && totalRetail > 0) {
          updateData.estimatedBudgetMin = Math.round(totalRetail * 0.8);
        }
        if (!order.estimatedBudgetMax && totalRetail > 0) {
          updateData.estimatedBudgetMax = Math.round(totalRetail * 1.2);
        }

        // Update estimated links count if missing
        if (!order.estimatedLinksCount && lineItems.length > 0) {
          updateData.estimatedLinksCount = lineItems.length;
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 1) { // More than just updatedAt
          await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, order.id));

          results.push({
            orderId: order.id,
            status: 'updated',
            fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
            totalRetail: totalRetail,
            pricePerLink: estimatedPricePerLink,
            itemCount: lineItems.length
          });
        } else {
          results.push({
            orderId: order.id,
            status: 'skipped',
            reason: 'No updates needed'
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
    console.error('Error fixing benchmark fields:', error);
    return NextResponse.json(
      { error: 'Failed to fix benchmark fields' },
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
    const ordersNeedingTotalRetail = await db.query.orders.findMany({
      where: or(
        isNull(orders.totalRetail),
        eq(orders.totalRetail, 0)
      ),
      columns: {
        id: true,
        status: true,
        createdAt: true,
        totalRetail: true,
        estimatedPricePerLink: true
      }
    });

    const ordersNeedingPricePerLink = await db.query.orders.findMany({
      where: or(
        isNull(orders.estimatedPricePerLink),
        eq(orders.estimatedPricePerLink, 0)
      ),
      columns: {
        id: true,
        status: true,
        createdAt: true,
        totalRetail: true,
        estimatedPricePerLink: true
      }
    });

    return NextResponse.json({
      needsFixing: {
        totalRetail: ordersNeedingTotalRetail.length,
        pricePerLink: ordersNeedingPricePerLink.length,
        total: Math.max(ordersNeedingTotalRetail.length, ordersNeedingPricePerLink.length)
      },
      preview: {
        missingTotalRetail: ordersNeedingTotalRetail.slice(0, 5),
        missingPricePerLink: ordersNeedingPricePerLink.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Error checking benchmark fields status:', error);
    return NextResponse.json(
      { error: 'Failed to check benchmark fields status' },
      { status: 500 }
    );
  }
}