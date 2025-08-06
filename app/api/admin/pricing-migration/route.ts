import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      tablesUpdated: 0,
      columnsAdded: 0,
      ordersMigrated: 0,
      details: {
        preferenceColumns: false,
        snapshotColumns: false,
        errors: [] as string[]
      }
    };

    // Run migrations in a transaction
    await db.transaction(async (tx) => {
      // 1. Add preference columns to orders table
      try {
        await tx.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN IF NOT EXISTS estimated_budget_min INTEGER,
          ADD COLUMN IF NOT EXISTS estimated_budget_max INTEGER,
          ADD COLUMN IF NOT EXISTS estimated_links_count INTEGER,
          ADD COLUMN IF NOT EXISTS preferences_dr_min INTEGER,
          ADD COLUMN IF NOT EXISTS preferences_dr_max INTEGER,
          ADD COLUMN IF NOT EXISTS preferences_traffic_min INTEGER,
          ADD COLUMN IF NOT EXISTS preferences_categories TEXT[],
          ADD COLUMN IF NOT EXISTS preferences_types TEXT[],
          ADD COLUMN IF NOT EXISTS preferences_niches TEXT[],
          ADD COLUMN IF NOT EXISTS estimator_snapshot JSONB,
          ADD COLUMN IF NOT EXISTS estimated_price_per_link INTEGER,
          ADD COLUMN IF NOT EXISTS actual_price_per_link INTEGER,
          ADD COLUMN IF NOT EXISTS preference_match_score DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS template_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS copied_from_order_id UUID
        `);
        results.columnsAdded += 16;
        results.details.preferenceColumns = true;
        results.tablesUpdated++;
      } catch (error: any) {
        console.error('Error adding preference columns:', error);
        results.details.errors.push(`Preference columns: ${error.message}`);
      }

      // 2. Add price snapshot columns to order_site_submissions table
      try {
        await tx.execute(sql`
          ALTER TABLE order_site_submissions 
          ADD COLUMN IF NOT EXISTS wholesale_price_snapshot INTEGER,
          ADD COLUMN IF NOT EXISTS retail_price_snapshot INTEGER,
          ADD COLUMN IF NOT EXISTS service_fee_snapshot INTEGER DEFAULT 7900,
          ADD COLUMN IF NOT EXISTS price_snapshot_at TIMESTAMP
        `);
        results.columnsAdded += 4;
        results.details.snapshotColumns = true;
        results.tablesUpdated++;
      } catch (error: any) {
        console.error('Error adding snapshot columns:', error);
        results.details.errors.push(`Snapshot columns: ${error.message}`);
      }

      // 3. Update existing orders with package pricing to new model
      try {
        // Get orders that might have old package pricing
        const ordersToMigrate = await tx.execute(sql`
          SELECT id, total_retail, total_wholesale, profit_margin
          FROM orders
          WHERE estimated_price_per_link IS NULL
          AND total_retail > 0
        `);

        if (ordersToMigrate.rows.length > 0) {
          for (const order of ordersToMigrate.rows) {
            // Estimate link count from total price (assuming average $279 per link)
            const estimatedLinks = Math.round((order.total_retail as number) / 27900);
            const serviceFeeTotal = estimatedLinks * 7900;
            
            // Update order with new pricing model
            await tx.execute(sql`
              UPDATE orders
              SET 
                estimated_links_count = ${estimatedLinks},
                estimated_price_per_link = 27900,
                profit_margin = ${serviceFeeTotal},
                total_wholesale = ${(order.total_retail as number) - serviceFeeTotal}
              WHERE id = ${order.id}
            `);
            
            results.ordersMigrated++;
          }
        }
      } catch (error: any) {
        console.error('Error migrating orders:', error);
        results.details.errors.push(`Order migration: ${error.message}`);
      }

      // 4. Add comments to new columns for documentation
      try {
        await tx.execute(sql`
          COMMENT ON COLUMN orders.estimated_budget_min IS 'Minimum budget estimate in cents';
          COMMENT ON COLUMN orders.estimated_budget_max IS 'Maximum budget estimate in cents';
          COMMENT ON COLUMN orders.preferences_dr_min IS 'Minimum Domain Rating preference';
          COMMENT ON COLUMN orders.preferences_dr_max IS 'Maximum Domain Rating preference';
          COMMENT ON COLUMN orders.preferences_traffic_min IS 'Minimum monthly traffic preference';
          COMMENT ON COLUMN orders.preferences_categories IS 'Preferred website categories';
          COMMENT ON COLUMN orders.preferences_types IS 'Preferred website types';
          COMMENT ON COLUMN orders.estimated_price_per_link IS 'Estimated price per link in cents';
          COMMENT ON COLUMN order_site_submissions.wholesale_price_snapshot IS 'Wholesale price in cents at time of approval';
          COMMENT ON COLUMN order_site_submissions.retail_price_snapshot IS 'Retail price in cents at time of approval';
          COMMENT ON COLUMN order_site_submissions.service_fee_snapshot IS 'Service fee in cents at time of approval';
        `);
      } catch (error: any) {
        // Comments are non-critical, just log
        console.log('Could not add column comments:', error.message);
      }
    });

    return NextResponse.json({
      success: true,
      ...results,
      message: 'Pricing migration completed successfully'
    });

  } catch (error: any) {
    console.error('Pricing migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}