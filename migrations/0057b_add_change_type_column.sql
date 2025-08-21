-- Migration 0057b: Add change_type column to line_item_changes
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS change_type VARCHAR(50);

-- Convert field_name to change_type (only if field_name exists)
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
WHERE change_type IS NULL 
AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'field_name');

-- Set default for any NULL values
UPDATE line_item_changes 
SET change_type = 'field_changed' 
WHERE change_type IS NULL;

-- Make change_type NOT NULL
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057b_add_change_type_column', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057b_add_change_type_column'
);