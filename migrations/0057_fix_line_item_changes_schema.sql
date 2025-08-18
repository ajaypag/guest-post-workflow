-- Migration 0057: Fix line_item_changes table schema
-- The table has wrong columns - need to match the frontend expectations

-- Drop the existing table and recreate with correct schema
DROP TABLE IF EXISTS line_item_changes;

CREATE TABLE line_item_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES order_line_items(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  change_type VARCHAR(50) NOT NULL,
  -- created, status_changed, client_changed, domain_assigned, domain_changed, 
  -- price_changed, cancelled, restored, target_changed, anchor_changed
  
  previous_value JSONB,
  new_value JSONB,
  
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  
  -- For grouping bulk changes
  batch_id UUID,
  
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS changes_line_item_id_idx ON line_item_changes(line_item_id);
CREATE INDEX IF NOT EXISTS changes_order_id_idx ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS changes_changed_at_idx ON line_item_changes(changed_at);
CREATE INDEX IF NOT EXISTS changes_batch_id_idx ON line_item_changes(batch_id);

-- Add migration tracking
INSERT INTO migrations (name, applied_at) 
SELECT '0057_fix_line_item_changes_schema', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057_fix_line_item_changes_schema'
);

COMMENT ON TABLE line_item_changes IS 'Audit trail for all changes to line items - corrected schema';