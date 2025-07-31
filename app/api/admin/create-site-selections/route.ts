import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if table already exists
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'order_site_selections'
    `);

    if (tableCheck.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        alreadyExists: true
      });
    }

    // Create the table
    await db.execute(sql`
      CREATE TABLE order_site_selections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
        domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
        
        -- Selection details
        status VARCHAR(50) NOT NULL DEFAULT 'suggested',
        -- Statuses: suggested, approved, rejected, alternate
        
        -- Assignment (once approved)
        target_page_url TEXT,
        anchor_text VARCHAR(255),
        
        -- Review tracking
        reviewed_at TIMESTAMP,
        reviewed_by UUID REFERENCES users(id),
        client_notes TEXT,
        internal_notes TEXT,
        
        -- Becomes order_item when approved
        order_item_id UUID REFERENCES order_items(id),
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX idx_selections_group ON order_site_selections(order_group_id)
    `);

    await db.execute(sql`
      CREATE INDEX idx_selections_status ON order_site_selections(status)
    `);

    await db.execute(sql`
      CREATE INDEX idx_selections_domain ON order_site_selections(domain_id)
    `);

    return NextResponse.json({
      success: true,
      message: 'Successfully created order_site_selections table with indexes'
    });

  } catch (error: any) {
    console.error('Error creating site selections table:', error);
    
    // Check if it's a "table already exists" error
    if (error.message.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        alreadyExists: true
      });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}