-- Migration 0065: Add order completion tracking fields
-- Adds fields for tracking workflow counts and fulfillment dates on orders
-- Date: 2025-01-22

-- Workflow tracking fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_workflows INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS completed_workflows INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS workflow_completion_percentage NUMERIC(5,2) DEFAULT 0 
  CHECK (workflow_completion_percentage >= 0 AND workflow_completion_percentage <= 100);

-- Fulfillment tracking dates
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_started_at TIMESTAMP;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_completed_at TIMESTAMP;

-- Ready for delivery flag
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ready_for_delivery BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_workflow_completion ON orders(workflow_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_orders_ready_for_delivery ON orders(ready_for_delivery);

-- Add comments for documentation
COMMENT ON COLUMN orders.total_workflows IS 'Total number of workflows created for this order';
COMMENT ON COLUMN orders.completed_workflows IS 'Number of completed workflows for this order';
COMMENT ON COLUMN orders.workflow_completion_percentage IS 'Overall workflow completion percentage (0-100)';
COMMENT ON COLUMN orders.fulfillment_started_at IS 'When fulfillment work began (first workflow progress)';
COMMENT ON COLUMN orders.fulfillment_completed_at IS 'When all workflows were completed';
COMMENT ON COLUMN orders.ready_for_delivery IS 'Whether order is ready for client delivery';
