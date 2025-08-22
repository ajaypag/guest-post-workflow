-- Migration 0057 FIXED: Fix line_item_changes table to match frontend schema
-- Converting FROM: field_name, old_value, new_value 
-- Converting TO: order_id, change_type, previous_value, new_value, batch_id, metadata

-- First, let's check what columns exist and handle them safely
DO $$ 
BEGIN
    -- Add missing columns safely
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'order_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN order_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        ALTER TABLE line_item_changes ADD COLUMN change_type VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'previous_value') THEN
        ALTER TABLE line_item_changes ADD COLUMN previous_value JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'batch_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN batch_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'metadata') THEN
        ALTER TABLE line_item_changes ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Only proceed with data migration if there are rows and old columns exist
DO $$
DECLARE 
    row_count INTEGER;
    has_field_name BOOLEAN := FALSE;
    has_old_value BOOLEAN := FALSE;
    has_new_value_text BOOLEAN := FALSE;
BEGIN
    -- Check if we have any rows
    SELECT COUNT(*) INTO row_count FROM line_item_changes;
    
    -- Check if old columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'line_item_changes' AND column_name = 'field_name'
    ) INTO has_field_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'line_item_changes' AND column_name = 'old_value'
    ) INTO has_old_value;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'line_item_changes' AND column_name = 'new_value' 
        AND data_type IN ('text', 'character varying')
    ) INTO has_new_value_text;
    
    -- Only migrate data if we have rows and old schema
    IF row_count > 0 THEN
        RAISE NOTICE 'Found % rows to migrate', row_count;
        
        -- Convert field_name -> change_type if field_name exists
        IF has_field_name THEN
            RAISE NOTICE 'Migrating field_name to change_type';
            UPDATE line_item_changes 
            SET change_type = COALESCE(field_name, 'unknown')
            WHERE change_type IS NULL;
        ELSE
            -- Set default change_type for all rows
            UPDATE line_item_changes 
            SET change_type = 'modified'
            WHERE change_type IS NULL;
        END IF;
        
        -- Convert old_value -> previous_value if old_value exists
        IF has_old_value THEN
            RAISE NOTICE 'Migrating old_value to previous_value';
            UPDATE line_item_changes 
            SET previous_value = CASE 
                WHEN old_value IS NOT NULL AND old_value != '' THEN 
                    jsonb_build_object('value', old_value)
                ELSE NULL 
            END
            WHERE previous_value IS NULL;
        END IF;
        
        -- Handle new_value conversion safely
        IF has_new_value_text THEN
            RAISE NOTICE 'Converting new_value from text to JSONB';
            -- Create temp column
            ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS temp_new_value JSONB;
            
            -- Convert safely
            UPDATE line_item_changes 
            SET temp_new_value = CASE 
                WHEN new_value IS NOT NULL AND new_value != '' THEN 
                    jsonb_build_object('value', new_value)
                ELSE NULL 
            END;
            
            -- Drop old new_value column and rename temp
            ALTER TABLE line_item_changes DROP COLUMN IF EXISTS new_value;
            ALTER TABLE line_item_changes RENAME COLUMN temp_new_value TO new_value;
        END IF;
        
        -- Set order_id by joining to line items
        RAISE NOTICE 'Setting order_id from line items';
        UPDATE line_item_changes 
        SET order_id = oli.order_id
        FROM order_line_items oli
        WHERE line_item_changes.line_item_id = oli.id
        AND line_item_changes.order_id IS NULL;
        
    ELSE
        RAISE NOTICE 'No rows to migrate, setting up clean schema';
        -- If no rows, just ensure we have proper defaults
        UPDATE line_item_changes SET change_type = 'created' WHERE change_type IS NULL;
    END IF;
    
    -- Clean up old columns if they exist
    IF has_field_name THEN
        ALTER TABLE line_item_changes DROP COLUMN field_name;
    END IF;
    
    IF has_old_value THEN
        ALTER TABLE line_item_changes DROP COLUMN old_value;
    END IF;
    
END $$;

-- Make required columns NOT NULL where appropriate
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_line_item_changes_order_id'
    ) THEN
        ALTER TABLE line_item_changes 
        ADD CONSTRAINT fk_line_item_changes_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_line_item_changes_order_id ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_item_changes_type ON line_item_changes(change_type);

-- Add migration tracking
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema_fixed', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema_fixed'
);

COMMENT ON TABLE line_item_changes IS 'Audit trail for all changes to line items - schema fixed to match frontend (v2)';