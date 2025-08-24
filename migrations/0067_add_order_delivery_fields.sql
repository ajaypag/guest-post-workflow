-- Migration 0067: Add missing delivery tracking fields to orders table
-- These fields are defined in orderSchema.ts but were never added to the database
-- Date: 2025-01-22

-- Add delivery tracking fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_notified_at ON orders(client_notified_at);

-- Add comments for documentation
COMMENT ON COLUMN orders.delivered_at IS 'When the order was delivered to the client';
COMMENT ON COLUMN orders.client_notified_at IS 'When the client was notified about order completion';