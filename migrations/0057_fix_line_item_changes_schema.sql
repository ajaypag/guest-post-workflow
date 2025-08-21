-- Migration 0057: Smart line_item_changes schema migration
-- Handles case where schema may already be correct

DO $$
DECLARE
    has_old_schema BOOLEAN := FALSE;
    has_new_schema BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE 'Starting Migration 0057: line_item_changes schema check';
    
    -- Check if we have old schema (field_name column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'field_name') THEN
        has_old_schema := TRUE;
        RAISE NOTICE 'Found old schema with field_name column';
    END IF;
    
    -- Check if we're missing any new schema columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'order_id') THEN
        has_new_schema := FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        has_new_schema := FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'previous_value') THEN
        has_new_schema := FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'batch_id') THEN
        has_new_schema := FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'metadata') THEN
        has_new_schema := FALSE;
    END IF;
    
    -- Report current state
    IF has_new_schema THEN
        RAISE NOTICE 'Schema is already correct - all required columns exist';
    ELSE
        RAISE NOTICE 'Schema needs updating - adding missing columns';
    END IF;
    
    -- Add missing columns if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'order_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN order_id UUID;
        RAISE NOTICE 'Added order_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        ALTER TABLE line_item_changes ADD COLUMN change_type VARCHAR(50);
        RAISE NOTICE 'Added change_type column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'previous_value') THEN
        ALTER TABLE line_item_changes ADD COLUMN previous_value JSONB;
        RAISE NOTICE 'Added previous_value column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'batch_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN batch_id UUID;
        RAISE NOTICE 'Added batch_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'metadata') THEN
        ALTER TABLE line_item_changes ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column';
    END IF;
    
    -- Migrate data if we have old schema
    IF has_old_schema THEN
        RAISE NOTICE 'Migrating data from old schema';
        
        -- Convert field_name to change_type
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
        
        -- Convert old_value to previous_value JSONB
        UPDATE line_item_changes 
        SET previous_value = CASE 
            WHEN old_value IS NOT NULL AND old_value != '' THEN 
                jsonb_build_object('value', old_value)
            ELSE NULL 
        END
        WHERE previous_value IS NULL;
        
        -- Set order_id from line items
        UPDATE line_item_changes 
        SET order_id = oli.order_id
        FROM order_line_items oli
        WHERE line_item_changes.line_item_id = oli.id
        AND line_item_changes.order_id IS NULL;
        
        -- Drop old columns
        ALTER TABLE line_item_changes DROP COLUMN IF EXISTS field_name;
        ALTER TABLE line_item_changes DROP COLUMN IF EXISTS old_value;
        
        RAISE NOTICE 'Data migration completed';
    END IF;
    
    -- Set defaults for any NULL values
    UPDATE line_item_changes 
    SET change_type = 'field_changed' 
    WHERE change_type IS NULL;
    
    -- Make change_type NOT NULL if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'line_item_changes' 
        AND column_name = 'change_type' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE line_item_changes ALTER COLUMN change_type SET NOT NULL;
        RAISE NOTICE 'Made change_type NOT NULL';
    END IF;
    
    RAISE NOTICE 'Migration 0057 main block completed';
END $$;

-- Add foreign key constraint if it doesn't exist
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
        RAISE NOTICE 'Added foreign key constraint for order_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Create indexes only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_order_id') THEN
        CREATE INDEX idx_line_item_changes_order_id ON line_item_changes(order_id);
        RAISE NOTICE 'Created index on order_id';
    ELSE
        RAISE NOTICE 'Index on order_id already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_change_type') THEN
        CREATE INDEX idx_line_item_changes_change_type ON line_item_changes(change_type);
        RAISE NOTICE 'Created index on change_type';
    ELSE
        RAISE NOTICE 'Index on change_type already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_batch_id') THEN
        CREATE INDEX idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;
        RAISE NOTICE 'Created index on batch_id';
    ELSE
        RAISE NOTICE 'Index on batch_id already exists';
    END IF;
END $$;

-- Record migration completion
DO $$
BEGIN
    -- Try the new schema first
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'migrations' AND column_name = 'name') THEN
        INSERT INTO migrations (name, applied_at) 
        SELECT '0057_fix_line_item_changes_schema', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema'
        );
        RAISE NOTICE 'Recorded migration in migrations table';
    -- Try the old schema
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'migration_history' AND column_name = 'migration_name') THEN
        INSERT INTO migration_history (migration_name, success) 
        SELECT '0057_fix_line_item_changes_schema', true
        WHERE NOT EXISTS (
            SELECT 1 FROM migration_history WHERE migration_name = '0057_fix_line_item_changes_schema'
        );
        RAISE NOTICE 'Recorded migration in migration_history table';
    ELSE
        RAISE NOTICE 'No suitable migrations table found';
    END IF;
END $$;