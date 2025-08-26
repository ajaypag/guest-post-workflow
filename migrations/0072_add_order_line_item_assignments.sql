-- Migration 0072: Add assignment capability to order line items and deadline tracking
-- This adds user assignment to individual line items for workload distribution
-- Also adds expected delivery date to orders for deadline tracking

-- Add assigned_to column for who is working on this line item
ALTER TABLE order_line_items 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- Add assignment tracking columns
ALTER TABLE order_line_items
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Add expected delivery date to orders for deadline tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP;

-- Add index for performance (line items table will grow large)
CREATE INDEX IF NOT EXISTS idx_order_line_items_assigned_to 
ON order_line_items(assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Add composite index for filtering by assignment and status
CREATE INDEX IF NOT EXISTS idx_order_line_items_assigned_status 
ON order_line_items(assigned_to, status) 
WHERE assigned_to IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN order_line_items.assigned_to IS 'User assigned to work on this specific line item. Defaults to order assignee but can be reassigned for workload distribution.';
COMMENT ON COLUMN order_line_items.assigned_at IS 'Timestamp when the line item was assigned to the current user';
COMMENT ON COLUMN order_line_items.assignment_notes IS 'Notes about the assignment or special instructions';