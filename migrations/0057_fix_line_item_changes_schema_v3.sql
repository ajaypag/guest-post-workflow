-- Migration 0057 V3: Fix line_item_changes table based on ACTUAL current schema
-- Current schema has: id, line_item_id, field_name, old_value, new_value, changed_by, changed_at, change_reason
-- Target schema needs: id, line_item_id, order_id, change_type, previous_value, new_value, changed_by, changed_at, change_reason, batch_id, metadata

-- Step 1: Add the missing columns we need
ALTER TABLE line_item_changes 
ADD COLUMN IF NOT EXISTS order_id UUID,
ADD COLUMN IF NOT EXISTS change_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS previous_value JSONB,
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 2: Since table is empty, we don't need to migrate data, but let's handle it safely anyway
DO $$
DECLARE 
    row_count INTEGER;
BEGIN
    -- Check if we have any rows
    SELECT COUNT(*) INTO row_count FROM line_item_changes;
    
    IF row_count > 0 THEN
        RAISE NOTICE 'Found % rows to migrate', row_count;
        
        -- Migrate field_name -> change_type
        UPDATE line_item_changes 
        SET change_type = CASE 
            WHEN field_name = 'status' THEN 'status_changed'
            WHEN field_name = 'target_page_url' THEN 'target_changed'
            WHEN field_name = 'anchor_text' THEN 'anchor_changed'
            WHEN field_name = 'estimated_price' THEN 'price_changed'
            WHEN field_name = 'assigned_domain_id' THEN 'domain_assigned'
            WHEN field_name = 'wholesale_price' THEN 'price_changed'
            WHEN field_name = 'inclusion_status' THEN 'inclusion_changed'
            ELSE COALESCE(field_name, 'field_changed')
        END
        WHERE change_type IS NULL;
        
        -- Migrate old_value -> previous_value (wrap in JSONB)
        UPDATE line_item_changes 
        SET previous_value = CASE 
            WHEN old_value IS NOT NULL AND old_value != '' THEN 
                jsonb_build_object('value', old_value, 'field', field_name)
            ELSE NULL 
        END
        WHERE previous_value IS NULL;
        
        -- Convert new_value to JSONB format but keep the column as text for now
        -- We'll handle the type conversion in the next migration to avoid conflicts
        
        -- Set order_id by joining with order_line_items
        UPDATE line_item_changes 
        SET order_id = oli.order_id
        FROM order_line_items oli
        WHERE line_item_changes.line_item_id = oli.id
        AND line_item_changes.order_id IS NULL;
        
    ELSE
        RAISE NOTICE 'Table is empty, no data migration needed';
    END IF;
    
    -- Set default change_type for any NULL values
    UPDATE line_item_changes 
    SET change_type = 'field_changed' 
    WHERE change_type IS NULL;
    
END $$;

-- Step 3: Make change_type NOT NULL since we've set defaults
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL;

-- Step 4: Remove the old field_name and old_value columns
ALTER TABLE line_item_changes 
DROP COLUMN IF EXISTS field_name,
DROP COLUMN IF EXISTS old_value;

-- Step 5: Add foreign key constraint for order_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_line_item_changes_order_id'
        AND table_name = 'line_item_changes'
    ) THEN
        ALTER TABLE line_item_changes 
        ADD CONSTRAINT fk_line_item_changes_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_line_item_changes_order_id ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_change_type ON line_item_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_item_changes_line_item_id ON line_item_changes(line_item_id);

-- Step 7: Update table comment
COMMENT ON TABLE line_item_changes IS 'Audit trail for line item changes - updated schema for frontend compatibility';

-- Step 8: Record migration completion
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema_v3', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema_v3'
);

-- Final schema verification
DO $$
DECLARE
    missing_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'order_id') THEN
        missing_cols := array_append(missing_cols, 'order_id');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        missing_cols := array_append(missing_cols, 'change_type');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'previous_value') THEN
        missing_cols := array_append(missing_cols, 'previous_value');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'batch_id') THEN
        missing_cols := array_append(missing_cols, 'batch_id');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'metadata') THEN
        missing_cols := array_append(missing_cols, 'metadata');
    END IF;
    
    IF array_length(missing_cols, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_cols, ', ');
    ELSE
        RAISE NOTICE 'Migration 0057 completed successfully - all required columns present';
    END IF;
END $$;