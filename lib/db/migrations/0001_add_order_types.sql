-- Migration: Add order types support
-- Date: 2025-02-01
-- Purpose: Refactor orders to support multiple order types (guest posts, link insertions, etc.)

-- 1. Add orderType to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'guest_post';

-- 2. Add index for order_type for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- 3. Rename order_items to guest_post_items (preserving all data and constraints)
ALTER TABLE order_items RENAME TO guest_post_items;

-- 4. Rename indexes to match new table name
ALTER INDEX idx_order_items_order_id RENAME TO idx_guest_post_items_order_id;
ALTER INDEX idx_order_items_domain_id RENAME TO idx_guest_post_items_domain_id;
ALTER INDEX idx_order_items_workflow_id RENAME TO idx_guest_post_items_workflow_id;
ALTER INDEX idx_order_items_status RENAME TO idx_guest_post_items_status;

-- 5. Update foreign key constraint names (if they exist)
-- Note: Constraint names might vary, adjust as needed
DO $$ 
BEGIN
    -- Rename foreign key constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey') THEN
        ALTER TABLE guest_post_items RENAME CONSTRAINT order_items_order_id_fkey TO guest_post_items_order_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_domain_id_fkey') THEN
        ALTER TABLE guest_post_items RENAME CONSTRAINT order_items_domain_id_fkey TO guest_post_items_domain_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_workflow_id_fkey') THEN
        ALTER TABLE guest_post_items RENAME CONSTRAINT order_items_workflow_id_fkey TO guest_post_items_workflow_id_fkey;
    END IF;
END $$;

-- 6. Update any references in order_site_selections table
-- The order_item_id column should now reference guest_post_items
-- First check if the constraint exists and update it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_site_selections_order_item_id_fkey'
        AND table_name = 'order_site_selections'
    ) THEN
        ALTER TABLE order_site_selections 
        DROP CONSTRAINT order_site_selections_order_item_id_fkey;
        
        ALTER TABLE order_site_selections 
        ADD CONSTRAINT order_site_selections_guest_post_item_id_fkey 
        FOREIGN KEY (order_item_id) REFERENCES guest_post_items(id);
    END IF;
END $$;

-- 7. Add comment to document the change
COMMENT ON TABLE guest_post_items IS 'Guest post specific order items. Previously named order_items.';
COMMENT ON COLUMN orders.order_type IS 'Type of order: guest_post, link_insertion, etc.';