-- Migration 0057d: Add batch_id and metadata columns to line_item_changes
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE line_item_changes ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Record migration
INSERT INTO migrations (name, applied_at) 
SELECT '0057d_add_metadata_columns', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = '0057d_add_metadata_columns'
);