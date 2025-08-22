-- Migration 0058: Complete line_item_changes schema alignment
-- After 0057, we just need to finalize the schema to match TypeScript requirements

-- Backup existing data first (just to be safe)
CREATE TABLE IF NOT EXISTS line_item_changes_backup_0058 AS 
SELECT * FROM line_item_changes;

-- Convert new_value from TEXT to JSONB
-- First add a temporary JSONB column
ALTER TABLE line_item_changes ADD COLUMN new_value_jsonb JSONB;

-- Convert existing TEXT values to JSONB
UPDATE line_item_changes 
SET new_value_jsonb = CASE 
    WHEN new_value IS NOT NULL AND new_value != '' THEN 
        jsonb_build_object('value', new_value)
    ELSE NULL 
END;

-- Drop the old TEXT column and rename the JSONB column
ALTER TABLE line_item_changes DROP COLUMN new_value;
ALTER TABLE line_item_changes RENAME COLUMN new_value_jsonb TO new_value;

-- Make required fields NOT NULL (only if they have valid values)
-- Set default for any NULL changed_by values to a system user ID
UPDATE line_item_changes 
SET changed_by = '00000000-0000-0000-0000-000000000000'::uuid 
WHERE changed_by IS NULL;

-- Make changed_by NOT NULL
ALTER TABLE line_item_changes ALTER COLUMN changed_by SET NOT NULL;

-- Set default for any NULL order_id values by looking up from line items
UPDATE line_item_changes 
SET order_id = oli.order_id
FROM order_line_items oli
WHERE line_item_changes.line_item_id = oli.id
AND line_item_changes.order_id IS NULL;

-- Only make order_id NOT NULL if all rows have valid order_id
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM line_item_changes WHERE order_id IS NULL;
    
    IF null_count = 0 THEN
        ALTER TABLE line_item_changes ALTER COLUMN order_id SET NOT NULL;
        RAISE NOTICE 'Made order_id NOT NULL - all rows have valid order_id';
    ELSE
        RAISE NOTICE 'Cannot make order_id NOT NULL - % rows have NULL order_id', null_count;
    END IF;
END $$;

-- Update changed_at to be NOT NULL with proper default
ALTER TABLE line_item_changes ALTER COLUMN changed_at SET NOT NULL;
ALTER TABLE line_item_changes ALTER COLUMN changed_at SET DEFAULT NOW();

-- Clean up backup table
DROP TABLE IF EXISTS line_item_changes_backup_0058;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0058_update_line_item_changes_schema', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0058_update_line_item_changes_schema'
);