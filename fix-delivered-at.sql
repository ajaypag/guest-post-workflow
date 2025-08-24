-- Fix for missing delivered_at column
-- Run this SQL in your production database

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

COMMENT ON COLUMN orders.delivered_at IS 'When the order was delivered to the client';