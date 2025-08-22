-- Migration 0057e: Drop old columns from line_item_changes
-- This should be run AFTER all data has been migrated to new columns

-- Drop old columns
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS field_name;
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS old_value;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057e_drop_old_columns', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057e_drop_old_columns'
);