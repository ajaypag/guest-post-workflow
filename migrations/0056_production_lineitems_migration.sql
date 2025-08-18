-- Migration 0056: Production Migration to LineItems System
-- This migration transitions from orderGroups to lineItems
-- 
-- IMPORTANT: Run this AFTER deploying the new code
-- The application will work with both systems during transition

-- Step 1: Ensure order_line_items table has all required columns
ALTER TABLE order_line_items 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_by UUID,
ADD COLUMN IF NOT EXISTS service_fee INTEGER DEFAULT 7900,
ADD COLUMN IF NOT EXISTS final_price INTEGER,
ADD COLUMN IF NOT EXISTS client_review_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS client_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_review_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS added_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS added_by UUID,
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS modified_by UUID,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS line_items_order_id_idx ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS line_items_client_id_idx ON order_line_items(client_id);
CREATE INDEX IF NOT EXISTS line_items_status_idx ON order_line_items(status);
CREATE INDEX IF NOT EXISTS line_items_assigned_domain_idx ON order_line_items(assigned_domain_id);

-- Step 3: Migrate existing orderGroups data to lineItems (if needed)
-- This creates lineItems for orders that only have orderGroups
DO $$
DECLARE
    order_rec RECORD;
    group_rec RECORD;
    selection_rec RECORD;
    line_item_id UUID;
    display_order_counter INTEGER;
BEGIN
    -- Find orders with orderGroups but no lineItems
    FOR order_rec IN 
        SELECT DISTINCT o.id 
        FROM orders o
        INNER JOIN order_groups og ON og.order_id = o.id
        LEFT JOIN order_line_items oli ON oli.order_id = o.id
        WHERE oli.id IS NULL
    LOOP
        display_order_counter := 0;
        
        -- Process each orderGroup
        FOR group_rec IN 
            SELECT * FROM order_groups 
            WHERE order_id = order_rec.id
        LOOP
            -- Create lineItems based on orderGroup's link count
            FOR i IN 1..COALESCE(group_rec.link_count, 1) LOOP
                line_item_id := gen_random_uuid();
                
                -- Try to get a matching site selection
                SELECT * INTO selection_rec
                FROM order_site_selections
                WHERE order_group_id = group_rec.id
                LIMIT 1 OFFSET (i - 1);
                
                -- Insert line item
                INSERT INTO order_line_items (
                    id,
                    order_id,
                    client_id,
                    target_page_url,
                    anchor_text,
                    status,
                    assigned_domain_id,
                    assigned_domain,
                    estimated_price,
                    wholesale_price,
                    service_fee,
                    added_at,
                    added_by,
                    display_order,
                    metadata
                ) VALUES (
                    line_item_id,
                    order_rec.id,
                    group_rec.client_id,
                    CASE 
                        WHEN group_rec.target_pages IS NOT NULL 
                        AND jsonb_array_length(group_rec.target_pages) > 0 
                        THEN (group_rec.target_pages->(i-1))->>'url'
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN group_rec.anchor_texts IS NOT NULL 
                        AND jsonb_array_length(group_rec.anchor_texts) > 0 
                        THEN group_rec.anchor_texts->>(i-1)
                        ELSE NULL 
                    END,
                    COALESCE(selection_rec.status, 'pending'),
                    selection_rec.domain_id,
                    selection_rec.domain,
                    COALESCE(selection_rec.retail_price, 0),
                    COALESCE(selection_rec.wholesale_price, 0),
                    7900, -- Standard service fee
                    NOW(),
                    COALESCE(group_rec.created_by, '97aca16f-8b81-44ad-a532-a6e3fa96cbfc'), -- Default to system user
                    display_order_counter,
                    jsonb_build_object(
                        'migrated_from_group', group_rec.id,
                        'migration_date', NOW(),
                        'original_project_id', group_rec.bulk_analysis_project_id
                    )
                );
                
                display_order_counter := display_order_counter + 1;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Migrated order % to lineItems', order_rec.id;
    END LOOP;
END $$;

-- Step 4: Update statistics
ANALYZE order_line_items;

-- Step 5: Add migration tracking
INSERT INTO migrations (name, applied_at) 
SELECT '0056_production_lineitems_migration', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0056_production_lineitems_migration'
);

-- Step 6: Add comments for documentation
COMMENT ON TABLE order_line_items IS 'Primary order tracking system - each link is a separate trackable unit';
COMMENT ON COLUMN order_line_items.metadata IS 'Flexible JSON storage including migration tracking';

-- Note: DO NOT DROP orderGroups tables yet - keep for rollback capability
-- After verification in production, run cleanup migration separately