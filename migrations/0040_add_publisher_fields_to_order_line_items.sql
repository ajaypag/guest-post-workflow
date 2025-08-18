-- Migration: Add Publisher Fields to Order Line Items
-- This migration adds publisher-related columns to the order_line_items table
-- to support the publisher order management system

-- Add publisher tracking columns
ALTER TABLE order_line_items 
ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS publisher_offering_id UUID REFERENCES publisher_offerings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS publisher_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS publisher_price INTEGER DEFAULT NULL, -- In cents
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT NULL, -- In cents
ADD COLUMN IF NOT EXISTS publisher_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS publisher_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS publisher_submitted_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_id ON order_line_items(publisher_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_status ON order_line_items(publisher_status);
CREATE INDEX IF NOT EXISTS idx_order_line_items_publisher_offering ON order_line_items(publisher_offering_id);

-- Add comments for documentation
COMMENT ON COLUMN order_line_items.publisher_id IS 'The publisher assigned to handle this order line item';
COMMENT ON COLUMN order_line_items.publisher_offering_id IS 'The specific publisher offering used for this order';
COMMENT ON COLUMN order_line_items.publisher_status IS 'Publisher-specific status: pending, notified, accepted, rejected, in_progress, submitted, completed';
COMMENT ON COLUMN order_line_items.publisher_price IS 'The price agreed with the publisher (in cents)';
COMMENT ON COLUMN order_line_items.platform_fee IS 'Platform commission fee (in cents)';
COMMENT ON COLUMN order_line_items.publisher_notified_at IS 'When the publisher was notified about this order';
COMMENT ON COLUMN order_line_items.publisher_accepted_at IS 'When the publisher accepted this order';
COMMENT ON COLUMN order_line_items.publisher_submitted_at IS 'When the publisher submitted their work';

-- Update any existing records with default values if needed
-- This is safe to run multiple times
UPDATE order_line_items 
SET publisher_status = 'pending' 
WHERE publisher_id IS NOT NULL 
AND publisher_status IS NULL;