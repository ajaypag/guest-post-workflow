-- Migration: Add order completion tracking fields
-- File: 0065_add_order_completion_tracking.sql
-- Date: 2025-08-21
-- Purpose: Add workflow completion aggregation tracking to orders table

-- Add workflow completion tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_workflows INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_workflows INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workflow_completion_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_started_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_completed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_delivery BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN orders.total_workflows IS 'Total number of workflows generated for this order';
COMMENT ON COLUMN orders.completed_workflows IS 'Number of workflows completed for this order';
COMMENT ON COLUMN orders.workflow_completion_percentage IS 'Percentage of workflows completed (0-100)';
COMMENT ON COLUMN orders.fulfillment_started_at IS 'When first workflow was generated (fulfillment began)';
COMMENT ON COLUMN orders.fulfillment_completed_at IS 'When all workflows were completed';
COMMENT ON COLUMN orders.ready_for_delivery IS 'True when all workflows pass QA and ready for client delivery';
COMMENT ON COLUMN orders.delivered_at IS 'When final deliverables were provided to client';
COMMENT ON COLUMN orders.client_notified_at IS 'When client was notified of completion';

-- Create indexes for common fulfillment queries
CREATE INDEX IF NOT EXISTS idx_orders_workflow_completion_percentage ON orders(workflow_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_started_at ON orders(fulfillment_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_completed_at ON orders(fulfillment_completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_ready_for_delivery ON orders(ready_for_delivery);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

-- Set default values for existing orders
UPDATE orders 
SET total_workflows = 0, completed_workflows = 0, workflow_completion_percentage = 0
WHERE total_workflows IS NULL;

UPDATE orders 
SET ready_for_delivery = false
WHERE ready_for_delivery IS NULL;

-- Initialize workflow counts for existing orders with workflows
-- This will be handled by the application logic, but we can set a baseline
UPDATE orders 
SET fulfillment_started_at = created_at
WHERE status = 'paid' AND fulfillment_started_at IS NULL;

-- Log migration completion
INSERT INTO migrations (id, name, executed_at) 
VALUES (65, '0065_add_order_completion_tracking', NOW())
ON CONFLICT (id) DO NOTHING;