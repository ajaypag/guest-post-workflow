-- Migration 0057: Fix line_item_changes table based on ACTUAL current schema
-- Current: id, line_item_id, field_name, old_value, new_value, changed_by, changed_at, change_reason
-- Target: id, line_item_id, order_id, change_type, previous_value, new_value, changed_by, changed_at, change_reason, batch_id, metadata

-- Add the missing columns
ALTER TABLE line_item_changes 
ADD COLUMN order_id UUID,
ADD COLUMN change_type VARCHAR(50),
ADD COLUMN previous_value JSONB,
ADD COLUMN batch_id UUID,
ADD COLUMN metadata JSONB;

-- Convert field_name to change_type (table is empty but let's be safe)
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

-- Convert old_value to previous_value JSONB
UPDATE line_item_changes 
SET previous_value = CASE 
    WHEN old_value IS NOT NULL AND old_value != '' THEN 
        jsonb_build_object('value', old_value)
    ELSE NULL 
END;

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

-- Make change_type NOT NULL
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL;

-- Drop old columns
ALTER TABLE line_item_changes 
DROP COLUMN field_name,
DROP COLUMN old_value;

-- Add foreign key for order_id
ALTER TABLE line_item_changes 
ADD CONSTRAINT fk_line_item_changes_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_line_item_changes_order_id ON line_item_changes(order_id);
CREATE INDEX idx_line_item_changes_change_type ON line_item_changes(change_type);
CREATE INDEX idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema'
);