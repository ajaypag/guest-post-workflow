-- Add price snapshot columns to order_site_submissions
-- These capture the prices at the time of approval to handle price changes over time

ALTER TABLE order_site_submissions 
ADD COLUMN IF NOT EXISTS wholesale_price_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS retail_price_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS service_fee_snapshot INTEGER DEFAULT 7900,
ADD COLUMN IF NOT EXISTS price_snapshot_at TIMESTAMP;

-- Add comment explaining the columns
COMMENT ON COLUMN order_site_submissions.wholesale_price_snapshot IS 'Wholesale price in cents at time of approval';
COMMENT ON COLUMN order_site_submissions.retail_price_snapshot IS 'Retail price in cents at time of approval (wholesale + service fee)';
COMMENT ON COLUMN order_site_submissions.service_fee_snapshot IS 'Service fee in cents at time of approval (default $79)';
COMMENT ON COLUMN order_site_submissions.price_snapshot_at IS 'Timestamp when prices were captured';