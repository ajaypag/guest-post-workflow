import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if preference columns exist
    const preferenceCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN (
        'estimated_budget_min', 
        'preferences_dr_min', 
        'preferences_categories',
        'estimated_price_per_link'
      )
    `);
    
    // Check if snapshot columns exist
    const snapshotCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_site_submissions' 
      AND column_name IN (
        'wholesale_price_snapshot',
        'retail_price_snapshot',
        'service_fee_snapshot',
        'price_snapshot_at'
      )
    `);

    // Initialize counts
    let oldPricingCount = { rows: [{ count: 0 }] };
    let newPricingCount = { rows: [{ count: 0 }] };
    let ordersWithPreferences = { rows: [{ count: 0 }] };
    let snapshotsCount = { rows: [{ count: 0 }] };

    // Only query counts if columns exist
    const hasPreferences = preferenceCheck.rows.length >= 4;
    const hasSnapshots = snapshotCheck.rows.length >= 4;

    if (hasPreferences) {
      try {
        // Count orders with old pricing (no estimated_price_per_link)
        oldPricingCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM orders
          WHERE estimated_price_per_link IS NULL
          AND total_retail > 0
        `);

        // Count orders with new pricing
        newPricingCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM orders
          WHERE estimated_price_per_link IS NOT NULL
        `);

        // Count orders with preferences set
        ordersWithPreferences = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM orders
          WHERE preferences_dr_min IS NOT NULL
          OR preferences_categories IS NOT NULL
        `);
      } catch (error) {
        console.log('Could not query order counts:', error);
      }
    }

    if (hasSnapshots) {
      try {
        // Count submissions with price snapshots
        snapshotsCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM order_site_submissions
          WHERE wholesale_price_snapshot IS NOT NULL
        `);
      } catch (error) {
        console.log('Could not query snapshot counts:', error);
      }
    }

    return NextResponse.json({
      hasPreferenceColumns: hasPreferences,
      hasSnapshotColumns: hasSnapshots,
      ordersWithOldPricing: oldPricingCount.rows[0]?.count || 0,
      ordersWithNewPricing: newPricingCount.rows[0]?.count || 0,
      ordersWithPreferences: ordersWithPreferences.rows[0]?.count || 0,
      submissionsWithSnapshots: snapshotsCount.rows[0]?.count || 0,
      columnsFound: {
        preferences: preferenceCheck.rows.map((r: any) => r.column_name),
        snapshots: snapshotCheck.rows.map((r: any) => r.column_name)
      },
      migrationNeeded: !hasPreferences || !hasSnapshots
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Status check failed' },
      { status: 500 }
    );
  }
}