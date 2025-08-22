-- Migration 0057: Fix line_item_changes table schema
-- Convert from old schema (field_name, old_value) to new schema (change_type, previous_value, etc.)

-- Add missing columns (separate statements for API compatibility)
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS change_type VARCHAR(50);
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS previous_value JSONB;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Convert field_name to change_type (only if field_name exists and has data)
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

-- Convert old_value to previous_value JSONB (only if old_value exists)
UPDATE line_item_changes 
SET previous_value = CASE 
    WHEN old_value IS NOT NULL AND old_value != '' THEN 
        jsonb_build_object('value', old_value)
    ELSE NULL 
END
WHERE previous_value IS NULL
AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'line_item_changes' AND column_name = 'old_value');

-- Set order_id from line items
UPDATE line_item_changes 
SET order_id = oli.order_id
FROM order_line_items oli
WHERE line_item_changes.line_item_id = oli.id
AND line_item_changes.order_id IS NULL;

-- Set default change_type for any NULL values
UPDATE line_item_changes 
SET change_type = 'field_changed' 
WHERE change_type IS NULL;

-- Make change_type NOT NULL
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL;

-- Drop old columns
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS field_name;
ALTER TABLE line_item_changes DROP COLUMN IF EXISTS old_value;

-- Add foreign key constraint (will skip if already exists due to constraint on name)
ALTER TABLE line_item_changes 
ADD CONSTRAINT IF NOT EXISTS fk_line_item_changes_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_line_item_changes_order_id ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_change_type ON line_item_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema'
);