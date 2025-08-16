import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST() {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting migration 0040: Add publisher fields to order_line_items');

    // Add publisher tracking columns
    await db.execute(sql`
      ALTER TABLE order_line_items 
      ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS publisher_offering_id UUID REFERENCES publisher_offerings(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS publisher_status VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS publisher_price INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS publisher_notified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS publisher_accepted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS publisher_submitted_at TIMESTAMP
    `);

    // Add indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_id ON order_line_items(publisher_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_status ON order_line_items(publisher_status)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_offering ON order_line_items(publisher_offering_id)
    `);

    // Add comments for documentation
    await db.execute(sql`
      COMMENT ON COLUMN order_line_items.publisher_id IS 'The publisher assigned to handle this order line item'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN order_line_items.publisher_offering_id IS 'The specific publisher offering used for this order'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN order_line_items.publisher_status IS 'Publisher-specific status: pending, notified, accepted, rejected, in_progress, submitted, completed'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN order_line_items.publisher_price IS 'The price agreed with the publisher (in cents)'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN order_line_items.platform_fee IS 'Platform commission fee (in cents)'
    `);

    console.log('✅ Migration 0040 completed successfully');

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0040_add_publisher_fields', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Publisher fields added to order_line_items successfully'
    });

  } catch (error) {
    console.error('Migration 0040 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}