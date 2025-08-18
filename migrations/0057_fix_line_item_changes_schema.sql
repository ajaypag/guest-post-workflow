-- Migration 0057: Fix line_item_changes table to match frontend schema
-- Converting FROM: field_name, old_value, new_value 
-- Converting TO: order_id, change_type, previous_value, new_value, batch_id, metadata

-- Add missing columns
ALTER TABLE line_item_changes 
ADD COLUMN IF NOT EXISTS order_id UUID,
ADD COLUMN IF NOT EXISTS change_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS previous_value JSONB,
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Migrate data from old columns to new columns
-- Convert field_name -> change_type (use field_name as change type for now)
UPDATE line_item_changes 
SET change_type = COALESCE(field_name, 'unknown')
WHERE change_type IS NULL;

-- Convert old_value -> previous_value (wrap text in JSON)
UPDATE line_item_changes 
SET previous_value = CASE 
    WHEN old_value IS NOT NULL THEN to_jsonb(old_value)
    ELSE NULL 
END
WHERE previous_value IS NULL;

-- Convert new_value -> new_value (already exists, but wrap text in JSON)
-- First create temp column, then replace
ALTER TABLE line_item_changes ADD COLUMN temp_new_value JSONB;
UPDATE line_item_changes 
SET temp_new_value = CASE 
    WHEN new_value IS NOT NULL THEN to_jsonb(new_value)
    ELSE NULL 
END;

-- Set order_id by joining to line items
UPDATE line_item_changes 
SET order_id = oli.order_id
FROM order_line_items oli
WHERE line_item_changes.line_item_id = oli.id
AND line_item_changes.order_id IS NULL;

-- Drop old columns
ALTER TABLE line_item_changes 
DROP COLUMN IF EXISTS field_name,
DROP COLUMN IF EXISTS old_value;

-- Replace new_value with temp column
ALTER TABLE line_item_changes DROP COLUMN new_value;
ALTER TABLE line_item_changes RENAME COLUMN temp_new_value TO new_value;

-- Make required columns NOT NULL
ALTER TABLE line_item_changes 
ALTER COLUMN change_type SET NOT NULL,
ALTER COLUMN order_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE line_item_changes 
ADD CONSTRAINT fk_line_item_changes_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS changes_order_id_idx ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS changes_batch_id_idx ON line_item_changes(batch_id);

-- Add migration tracking
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema'
);

COMMENT ON TABLE line_item_changes IS 'Audit trail for all changes to line items - schema fixed to match frontend';