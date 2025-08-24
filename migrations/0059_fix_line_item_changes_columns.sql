-- Fix line_item_changes table to add missing columns
-- This migration adds the columns needed for the line items system
-- Date: 2025-08-19

-- Add missing columns if they don't exist
ALTER TABLE line_item_changes 
ADD COLUMN IF NOT EXISTS order_id UUID,
ADD COLUMN IF NOT EXISTS change_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS previous_value JSONB,
ADD COLUMN IF NOT EXISTS new_value_json JSONB,
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add foreign key for order_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'line_item_changes_order_id_fkey'
    ) THEN
        ALTER TABLE line_item_changes 
        ADD CONSTRAINT line_item_changes_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing rows to have default values for new columns
UPDATE line_item_changes 
SET 
    order_id = (SELECT order_id FROM order_line_items WHERE id = line_item_changes.line_item_id),
    change_type = 'modified',
    previous_value = jsonb_build_object('field', field_name, 'value', old_value),
    new_value_json = jsonb_build_object('field', field_name, 'value', new_value)
WHERE order_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_changes_order ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_changes_batch ON line_item_changes(batch_id);
CREATE INDEX IF NOT EXISTS idx_changes_type ON line_item_changes(change_type);