import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting order type migration...');
    
    // Run migration in a transaction
    const results = await db.transaction(async (tx) => {
      const migrationResults: any = {
        ordersCount: 0,
        itemsCount: 0,
        errors: []
      };

      try {
        // 1. Add order_type column if it doesn't exist
        console.log('Adding order_type column...');
        await tx.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'guest_post'
        `);
        
        // 2. Add index for order_type
        console.log('Adding order_type index...');
        await tx.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type)
        `);
        
        // 3. Count existing orders
        const orderCount = await tx.execute(sql`
          SELECT COUNT(*) as count FROM orders
        `);
        migrationResults.ordersCount = orderCount.rows[0]?.count || 0;
        
        // 4. Check if order_items table exists and guest_post_items doesn't
        const tableCheck = await tx.execute(sql`
          SELECT 
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') as order_items_exists,
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_post_items') as guest_post_items_exists
        `);
        
        const { order_items_exists, guest_post_items_exists } = tableCheck.rows[0];
        
        if (order_items_exists && !guest_post_items_exists) {
          console.log('Renaming order_items to guest_post_items...');
          
          // 5. Count items before rename
          const itemCount = await tx.execute(sql`
            SELECT COUNT(*) as count FROM order_items
          `);
          migrationResults.itemsCount = itemCount.rows[0]?.count || 0;
          
          // 6. Rename table
          await tx.execute(sql`
            ALTER TABLE order_items RENAME TO guest_post_items
          `);
          
          // 7. Rename indexes
          console.log('Renaming indexes...');
          await tx.execute(sql`
            ALTER INDEX IF EXISTS idx_order_items_order_id RENAME TO idx_guest_post_items_order_id
          `);
          await tx.execute(sql`
            ALTER INDEX IF EXISTS idx_order_items_domain_id RENAME TO idx_guest_post_items_domain_id
          `);
          await tx.execute(sql`
            ALTER INDEX IF EXISTS idx_order_items_workflow_id RENAME TO idx_guest_post_items_workflow_id
          `);
          await tx.execute(sql`
            ALTER INDEX IF EXISTS idx_order_items_status RENAME TO idx_guest_post_items_status
          `);
          
          // 8. Update foreign key constraints in order_site_selections
          console.log('Updating foreign key constraints...');
          const fkCheck = await tx.execute(sql`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'order_site_selections' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%order_item%'
          `);
          
          if (fkCheck.rows.length > 0) {
            // Drop and recreate the foreign key
            await tx.execute(sql`
              ALTER TABLE order_site_selections 
              DROP CONSTRAINT IF EXISTS order_site_selections_order_item_id_fkey
            `);
            
            await tx.execute(sql`
              ALTER TABLE order_site_selections 
              ADD CONSTRAINT order_site_selections_guest_post_item_id_fkey 
              FOREIGN KEY (order_item_id) REFERENCES guest_post_items(id)
            `);
          }
          
          // 9. Add table comment
          await tx.execute(sql`
            COMMENT ON TABLE guest_post_items IS 'Guest post specific order items. Previously named order_items.'
          `);
          
          console.log('Table rename completed successfully');
        } else if (guest_post_items_exists) {
          console.log('guest_post_items table already exists, skipping rename');
          
          // Still count the items
          const itemCount = await tx.execute(sql`
            SELECT COUNT(*) as count FROM guest_post_items
          `);
          migrationResults.itemsCount = itemCount.rows[0]?.count || 0;
        }
        
        // 10. Add comment to order_type column
        await tx.execute(sql`
          COMMENT ON COLUMN orders.order_type IS 'Type of order: guest_post, link_insertion, etc.'
        `);
        
        return migrationResults;
      } catch (error) {
        console.error('Migration error:', error);
        throw error;
      }
    });

    console.log('Migration completed successfully:', results);
    
    return NextResponse.json({
      message: 'Migration completed successfully',
      ...results
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}