import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const session = AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all orders with relevant status fields
    const ordersResult = await db.execute(sql`
      SELECT 
        o.id,
        o.status,
        o.state,
        o.account_id,
        a.email as account_email,
        a.name as account_name,
        o.created_at,
        o.updated_at,
        CASE 
          WHEN o.status = 'draft' THEN true
          WHEN o.state = 'draft' THEN true
          ELSE false
        END as should_show_delete,
        EXISTS(SELECT 1 FROM order_groups og WHERE og.order_id = o.id) as has_order_groups
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.id
      ORDER BY o.created_at DESC
      LIMIT 50
    `);
    
    // Also get a count of orders by status
    const statusCountResult = await db.execute(sql`
      SELECT 
        COALESCE(state, status) as order_status,
        COUNT(*) as count
      FROM orders
      GROUP BY COALESCE(state, status)
      ORDER BY count DESC
    `);

    // Get specific draft orders
    const draftOrdersResult = await db.execute(sql`
      SELECT 
        id,
        status,
        state,
        account_id,
        created_at
      FROM orders
      WHERE status = 'draft' OR state = 'draft'
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      orders: ordersResult.rows.map(row => ({
        id: row.id,
        status: row.status,
        state: row.state,
        accountId: row.account_id,
        accountEmail: row.account_email,
        accountName: row.account_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        shouldShowDelete: row.should_show_delete,
        hasOrderGroups: row.has_order_groups,
        actualStatusUsed: row.state || row.status // Show which field is actually being used
      })),
      statusCounts: statusCountResult.rows,
      draftOrders: draftOrdersResult.rows,
      summary: {
        totalOrders: ordersResult.rows.length,
        ordersWithState: ordersResult.rows.filter(r => r.state !== null).length,
        ordersWithStatusOnly: ordersResult.rows.filter(r => r.state === null).length,
        draftCount: draftOrdersResult.rows.length
      }
    });
  } catch (error) {
    console.error('Error in debug-order-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}