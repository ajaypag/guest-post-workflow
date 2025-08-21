-- Update line_item_changes table to match modern schema
-- This migration transforms the old simple schema to the new enhanced schema
-- Date: 2025-08-19
-- Purpose: Align line_item_changes with TypeScript schema for line items system

-- First, let's preserve any existing data by creating a backup
CREATE TABLE IF NOT EXISTS line_item_changes_backup AS 
SELECT * FROM line_item_changes;

-- Drop the old table (data is backed up)
DROP TABLE IF EXISTS line_item_changes CASCADE;

-- Create the new enhanced schema
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

-- Create indexes for performance
CREATE INDEX idx_line_item_changes_line_item ON line_item_changes(line_item_id);
CREATE INDEX idx_line_item_changes_order ON line_item_changes(order_id);
CREATE INDEX idx_line_item_changes_type ON line_item_changes(change_type);
CREATE INDEX idx_line_item_changes_batch ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;

-- Migrate existing data from backup to new schema (if any exists)
-- Convert old field-based changes to new change_type format
INSERT INTO line_item_changes (
  line_item_id,
  order_id,
  change_type,
  previous_value,
  new_value,
  changed_by,
  changed_at,
  change_reason
)
SELECT 
  b.line_item_id,
  oli.order_id, -- Get order_id from the line item
  CASE 
    WHEN b.field_name = 'status' THEN 'status_changed'
    WHEN b.field_name = 'target_page_url' THEN 'target_changed'
    WHEN b.field_name = 'anchor_text' THEN 'anchor_changed'
    WHEN b.field_name = 'estimated_price' THEN 'price_changed'
    WHEN b.field_name = 'assigned_domain_id' THEN 'domain_assigned'
    ELSE 'field_changed'
  END as change_type,
  CASE WHEN b.old_value IS NOT NULL THEN json_build_object('value', b.old_value) ELSE NULL END as previous_value,
  json_build_object('value', b.new_value) as new_value,
  b.changed_by,
  b.changed_at,
  b.change_reason
FROM line_item_changes_backup b
LEFT JOIN order_line_items oli ON oli.id = b.line_item_id
WHERE oli.id IS NOT NULL; -- Only migrate records with valid line items

-- Drop the backup table after successful migration
DROP TABLE IF EXISTS line_item_changes_backup;

-- Add a record to track this migration
INSERT INTO migrations (version, description, applied_at) 
VALUES ('0058', 'Update line_item_changes schema to enhanced format', NOW())
ON CONFLICT (version) DO NOTHING;