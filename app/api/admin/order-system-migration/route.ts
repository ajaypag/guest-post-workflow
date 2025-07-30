import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('Starting order system migration...');
  
  try {
    // Start a transaction
    await db.transaction(async (tx) => {
      // 1. Add new columns to orders table
      console.log('Updating orders table...');
      
      // Check if state column exists
      const stateCheck = await tx.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'state'
      `);
      
      if (stateCheck.rows.length === 0) {
        await tx.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN state VARCHAR(50) DEFAULT 'configuring',
          ADD COLUMN requires_client_review BOOLEAN DEFAULT false,
          ADD COLUMN review_completed_at TIMESTAMP
        `);
      }
      
      // 2. Create order_groups table
      console.log('Creating order_groups table...');
      const orderGroupsCheck = await tx.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'order_groups'
        )
      `);
      
      if (!orderGroupsCheck.rows[0].exists) {
        await tx.execute(sql`
          CREATE TABLE order_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES clients(id),
            link_count INTEGER NOT NULL,
            target_pages JSONB DEFAULT '[]',
            anchor_texts JSONB DEFAULT '[]',
            requirement_overrides JSONB DEFAULT '{}',
            bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id),
            analysis_started_at TIMESTAMP,
            analysis_completed_at TIMESTAMP,
            group_status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
        
        // Create indexes
        await tx.execute(sql`CREATE INDEX idx_order_groups_order ON order_groups(order_id)`);
        await tx.execute(sql`CREATE INDEX idx_order_groups_client ON order_groups(client_id)`);
        await tx.execute(sql`CREATE INDEX idx_order_groups_analysis ON order_groups(bulk_analysis_project_id)`);
      }
      
      // 3. Create order_site_selections table
      console.log('Creating order_site_selections table...');
      const siteSelectionsCheck = await tx.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'order_site_selections'
        )
      `);
      
      if (!siteSelectionsCheck.rows[0].exists) {
        await tx.execute(sql`
          CREATE TABLE order_site_selections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
            domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
            status VARCHAR(50) NOT NULL DEFAULT 'suggested',
            target_page_url TEXT,
            anchor_text VARCHAR(255),
            reviewed_at TIMESTAMP,
            reviewed_by UUID REFERENCES users(id),
            client_notes TEXT,
            internal_notes TEXT,
            order_item_id UUID REFERENCES order_items(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
        
        // Create indexes
        await tx.execute(sql`CREATE INDEX idx_selections_group ON order_site_selections(order_group_id)`);
        await tx.execute(sql`CREATE INDEX idx_selections_status ON order_site_selections(status)`);
        await tx.execute(sql`CREATE INDEX idx_selections_domain ON order_site_selections(domain_id)`);
      }
      
      // 4. Update order_share_tokens if needed (it already exists)
      console.log('Checking order_share_tokens table...');
      const shareTokensCheck = await tx.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_share_tokens'
        ORDER BY ordinal_position
      `);
      
      if (shareTokensCheck.rows.length > 0) {
        console.log('order_share_tokens table already exists');
      }
      
      // 5. Add columns to order_items for linkage
      console.log('Updating order_items table...');
      const orderItemsCheck = await tx.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name IN ('order_group_id', 'site_selection_id')
      `);
      
      const existingColumns = orderItemsCheck.rows.map((r: any) => r.column_name);
      
      if (!existingColumns.includes('order_group_id')) {
        await tx.execute(sql`
          ALTER TABLE order_items 
          ADD COLUMN order_group_id UUID,
          ADD COLUMN site_selection_id UUID
        `);
      }
      
      // 6. Add default requirements to clients table
      console.log('Updating clients table...');
      const clientsCheck = await tx.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'default_requirements'
      `);
      
      if (clientsCheck.rows.length === 0) {
        await tx.execute(sql`
          ALTER TABLE clients 
          ADD COLUMN default_requirements JSONB DEFAULT '{}'
        `);
      }
      
      console.log('Order system migration completed successfully!');
    });
    
    // Get summary of changes
    const summary = {
      tables_created: [] as string[],
      columns_added: [] as string[],
      indexes_created: [] as string[]
    };
    
    // Check what was created
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('order_groups', 'order_site_selections')
      AND table_schema = 'public'
    `);
    
    summary.tables_created = tablesResult.rows.map((r: any) => r.table_name);
    
    return NextResponse.json({
      success: true,
      message: 'Order system migration completed successfully',
      summary
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}