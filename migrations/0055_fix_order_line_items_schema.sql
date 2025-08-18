-- Migration 0055: Fix order_line_items schema to match code
-- This migration aligns the database schema with the TypeScript schema

-- Add missing columns without foreign key constraints for now
ALTER TABLE order_line_items 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_by UUID,
ADD COLUMN IF NOT EXISTS service_fee INTEGER DEFAULT 7900,
ADD COLUMN IF NOT EXISTS final_price INTEGER,
ADD COLUMN IF NOT EXISTS client_review_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS client_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_review_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS added_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS added_by UUID,
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS modified_by UUID,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Update existing rows to have valid added_by values (use first admin user)
UPDATE order_line_items 
SET added_by = COALESCE(
    added_by_user_id, 
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '97aca16f-8b81-44ad-a532-a6e3fa96cbfc' -- fallback to Ajay's ID
)
WHERE added_by IS NULL;

-- Make added_by NOT NULL after populating it
ALTER TABLE order_line_items 
ALTER COLUMN added_by SET NOT NULL;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS line_items_order_id_idx ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS line_items_client_id_idx ON order_line_items(client_id);
CREATE INDEX IF NOT EXISTS line_items_status_idx ON order_line_items(status);
CREATE INDEX IF NOT EXISTS line_items_assigned_domain_idx ON order_line_items(assigned_domain_id);

-- Add comment for documentation
COMMENT ON TABLE order_line_items IS 'Line-item based order system - each link is a separate trackable unit';