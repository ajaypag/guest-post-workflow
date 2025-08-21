-- Migration 0057: Fix line_item_changes table based on ACTUAL current schema
-- Current: id, line_item_id, field_name, old_value, new_value, changed_by, changed_at, change_reason
-- Target: id, line_item_id, order_id, change_type, previous_value, new_value, changed_by, changed_at, change_reason, batch_id, metadata

-- Add the missing columns with explicit error handling
DO $$
BEGIN
    -- Add order_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'order_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN order_id UUID;
        RAISE NOTICE 'Added order_id column';
    ELSE
        RAISE NOTICE 'order_id column already exists';
    END IF;

    -- Add change_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        ALTER TABLE line_item_changes ADD COLUMN change_type VARCHAR(50);
        RAISE NOTICE 'Added change_type column';
    ELSE
        RAISE NOTICE 'change_type column already exists';
    END IF;

    -- Add previous_value column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'previous_value') THEN
        ALTER TABLE line_item_changes ADD COLUMN previous_value JSONB;
        RAISE NOTICE 'Added previous_value column';
    ELSE
        RAISE NOTICE 'previous_value column already exists';
    END IF;

    -- Add batch_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'batch_id') THEN
        ALTER TABLE line_item_changes ADD COLUMN batch_id UUID;
        RAISE NOTICE 'Added batch_id column';
    ELSE
        RAISE NOTICE 'batch_id column already exists';
    END IF;

    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'metadata') THEN
        ALTER TABLE line_item_changes ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column';
    ELSE
        RAISE NOTICE 'metadata column already exists';
    END IF;
END $$;

-- Convert field_name to change_type (only if field_name exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'field_name') THEN
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
        END;
        RAISE NOTICE 'Converted field_name to change_type';
    ELSE
        RAISE NOTICE 'field_name column does not exist, skipping conversion';
    END IF;
END $$;

-- Convert old_value to previous_value JSONB (only if old_value exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'old_value') THEN
        UPDATE line_item_changes 
        SET previous_value = CASE 
            WHEN old_value IS NOT NULL AND old_value != '' THEN 
                jsonb_build_object('value', old_value)
            ELSE NULL 
        END;
        RAISE NOTICE 'Converted old_value to previous_value';
    ELSE
        RAISE NOTICE 'old_value column does not exist, skipping conversion';
    END IF;
END $$;

-- Set order_id from line items (join with order_line_items)
UPDATE line_item_changes 
SET order_id = oli.order_id
FROM order_line_items oli
WHERE line_item_changes.line_item_id = oli.id
AND line_item_changes.order_id IS NULL;

-- Set default change_type for any NULL values
UPDATE line_item_changes 
SET change_type = 'field_changed' 
WHERE change_type IS NULL;

-- Make change_type NOT NULL (only if the column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'change_type') THEN
        ALTER TABLE line_item_changes ALTER COLUMN change_type SET NOT NULL;
        RAISE NOTICE 'Made change_type NOT NULL';
    END IF;
END $$;

-- Drop old columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'field_name') THEN
        ALTER TABLE line_item_changes DROP COLUMN field_name;
        RAISE NOTICE 'Dropped field_name column';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'old_value') THEN
        ALTER TABLE line_item_changes DROP COLUMN old_value;
        RAISE NOTICE 'Dropped old_value column';
    END IF;
END $$;

-- Add foreign key for order_id (only if it doesn't exist)
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
        RAISE NOTICE 'Foreign key constraint for order_id already exists';
    END IF;
END $$;

-- Create indexes (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_order_id') THEN
        CREATE INDEX idx_line_item_changes_order_id ON line_item_changes(order_id);
        RAISE NOTICE 'Created index on order_id';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_change_type') THEN
        CREATE INDEX idx_line_item_changes_change_type ON line_item_changes(change_type);
        RAISE NOTICE 'Created index on change_type';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_line_item_changes_batch_id') THEN
        CREATE INDEX idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;
        RAISE NOTICE 'Created index on batch_id';
    END IF;
END $$;

-- Record migration (handle different migration table schemas)
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