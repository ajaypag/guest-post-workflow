-- Migration 0057a: Add order_id column to line_item_changes
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS order_id UUID;

-- Set order_id from line items
UPDATE line_item_changes 
SET order_id = oli.order_id
FROM order_line_items oli
WHERE line_item_changes.line_item_id = oli.id
AND line_item_changes.order_id IS NULL;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057a_add_order_id_column', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057a_add_order_id_column'
);