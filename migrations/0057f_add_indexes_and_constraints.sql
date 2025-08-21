-- Migration 0057f: Add indexes and constraints to line_item_changes

-- Add foreign key constraint
ALTER TABLE line_item_changes 
ADD CONSTRAINT IF NOT EXISTS fk_line_item_changes_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_line_item_changes_order_id ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_change_type ON line_item_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057f_add_indexes_and_constraints', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057f_add_indexes_and_constraints'
);