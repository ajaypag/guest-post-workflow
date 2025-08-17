-- Migration: Add missing columns to publisher_performance table
-- Date: 2025-08-14
-- Purpose: Add missing performance metrics columns

BEGIN;

-- Add missing performance metrics columns
ALTER TABLE publisher_performance
ADD COLUMN IF NOT EXISTS content_approval_rate decimal(5, 2) DEFAULT 0;

ALTER TABLE publisher_performance
ADD COLUMN IF NOT EXISTS revision_rate decimal(5, 2) DEFAULT 0;

ALTER TABLE publisher_performance
ADD COLUMN IF NOT EXISTS total_revenue integer DEFAULT 0;

ALTER TABLE publisher_performance
ADD COLUMN IF NOT EXISTS avg_order_value integer DEFAULT 0;

ALTER TABLE publisher_performance
ADD COLUMN IF NOT EXISTS last_calculated_at timestamp DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN publisher_performance.content_approval_rate IS 'Percentage of content approved without major revisions';
COMMENT ON COLUMN publisher_performance.revision_rate IS 'Average number of revisions per order';
COMMENT ON COLUMN publisher_performance.total_revenue IS 'Total revenue in cents';
COMMENT ON COLUMN publisher_performance.avg_order_value IS 'Average order value in cents';
COMMENT ON COLUMN publisher_performance.last_calculated_at IS 'When metrics were last calculated';

COMMIT;