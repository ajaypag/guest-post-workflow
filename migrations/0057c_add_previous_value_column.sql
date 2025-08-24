-- Migration 0057c: Add previous_value column to line_item_changes
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS previous_value JSONB;

-- Convert old_value to previous_value JSONB (only if old_value exists)
UPDATE line_item_changes 
SET previous_value = CASE 
    WHEN old_value IS NOT NULL AND old_value != '' THEN 
        jsonb_build_object('value', old_value)
    ELSE NULL 
END
WHERE previous_value IS NULL
AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'old_value');

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057c_add_previous_value_column', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057c_add_previous_value_column'
);