-- Migration 0057_complete: Complete fix for line_item_changes table
-- This is a simplified version that should work with the API

-- Step 1: Add all new columns (will skip if they exist)
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS change_type VARCHAR(50);
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS previous_value JSONB;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 2: Set default values for change_type
UPDATE line_item_changes SET change_type = 'field_changed' WHERE change_type IS NULL;

-- Step 3: Make change_type NOT NULL
ALTER TABLE line_item_changes ALTER COLUMN change_type SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS field_name;
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS old_value;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057_complete_fix_line_item_changes', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_complete_fix_line_item_changes'
);