import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { sql, eq, and, or } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { isLineItemsSystemEnabled, shouldUseLineItemsForNewOrders } from '@/lib/config/featureFlags';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check database connectivity
    let database: 'healthy' | 'degraded' | 'offline' = 'healthy';
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      console.error('Database health check failed:', error);
      database = 'offline';
    }

    // Get system statistics
    const systemStats = await getSystemStatistics();

    const systemStatus = {
      database,
      lineItemsEnabled: isLineItemsSystemEnabled(),
      orderGroupsDisabled: !shouldUseLineItemsForNewOrders(), // If lineItems is forced, groups are disabled
      ...systemStats
    };

    return NextResponse.json(systemStatus);
  } catch (error: any) {
    console.error('Error getting system status:', error);
    
    // Return degraded status if we can't get full stats
    return NextResponse.json({
      database: 'degraded',
      lineItemsEnabled: false,
      orderGroupsDisabled: false,
      activeOrders: 0,
      pendingOrders: 0,
      hybridOrders: 0,
      lastMigration: null,
      error: error.message
    });
  }
}

async function getSystemStatistics() {
  try {
    // Count active orders (not cancelled)
    const activeOrdersResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(orders)
      .where(sql`${orders.status} != 'cancelled'`);
    const activeOrders = activeOrdersResult[0]?.count || 0;

    // Count pending orders (draft or pending_confirmation)
    const pendingOrdersResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(orders)
      .where(or(
        eq(orders.status, 'draft'),
        eq(orders.status, 'pending_confirmation')
      ));
    const pendingOrders = pendingOrdersResult[0]?.count || 0;

    // Count hybrid orders (have both orderGroups and lineItems)
    const hybridOrdersQuery = `
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      INNER JOIN order_groups og ON og.order_id = o.id
      INNER JOIN order_line_items oli ON oli.order_id = o.id
    `;
    const hybridOrdersResult = await db.execute(sql.raw(hybridOrdersQuery));
    const hybridOrders = parseInt((hybridOrdersResult.rows[0] as any)?.count || '0');

    // Get last migration timestamp (from most recent completed order migration)
    let lastMigration = null;
    try {
      // Use raw SQL to avoid Drizzle schema issues
      const lastMigrationResult = await db.execute(sql`
        SELECT modified_at 
        FROM order_line_items 
        ORDER BY modified_at DESC 
        LIMIT 1
      `);
      
      const row = lastMigrationResult.rows[0] as any;
      lastMigration = row?.modified_at ? new Date(row.modified_at).toISOString() : null;
    } catch (error) {
      console.log('Could not query line items modifiedAt:', error);
      lastMigration = null;
    }

    return {
      activeOrders,
      pendingOrders,
      hybridOrders,
      lastMigration
    };
  } catch (error) {
    console.error('Error getting system statistics:', error);
    throw error;
  }
}