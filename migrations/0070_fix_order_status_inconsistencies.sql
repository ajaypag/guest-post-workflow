-- Migration: Fix Order Status Inconsistencies
-- Date: 2025-08-25
-- Purpose: Align status and state fields for paid orders

-- Fix orders where state='payment_received' but status is not 'paid'
-- This was caused by payment success handlers only updating state but not status
UPDATE orders 
SET status = 'paid', 
    updated_at = NOW()
WHERE state = 'payment_received' 
  AND status != 'paid'
  AND paid_at IS NOT NULL;

-- Fix orders where status='payment_pending' but state='payment_received' (already paid)
UPDATE orders 
SET status = 'paid', 
    updated_at = NOW()
WHERE state = 'payment_received' 
  AND status = 'payment_pending'
  AND paid_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE orders IS 'Orders table with aligned status (main stage) and state (sub-status) fields';

-- Report on fixed orders (optional - for verification)
-- SELECT COUNT(*) as fixed_orders 
-- FROM orders 
-- WHERE state = 'payment_received' AND status = 'paid' AND paid_at IS NOT NULL;