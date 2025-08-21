-- Migration: Fix inclusion_status defaults to be 'included' by default
-- Problem: NULL inclusion_status causes UI confusion and breaks invoicing/metrics
-- Solution: Default to 'included' for better UX and functionality

BEGIN;

-- 1. Update existing line items with NULL inclusion_status to 'included'
-- Only update items that have an assigned domain (these are actively being used)
UPDATE order_line_items
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{inclusionStatus}',
  '"included"'::jsonb
)
WHERE assigned_domain_id IS NOT NULL
  AND (metadata->>'inclusionStatus' IS NULL OR metadata->>'inclusionStatus' = '');

-- 2. For line items without assigned domains, also default to 'included'
-- This ensures new assignments start with 'included' status
UPDATE order_line_items
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{inclusionStatus}',
  '"included"'::jsonb
)
WHERE metadata->>'inclusionStatus' IS NULL OR metadata->>'inclusionStatus' = '';

-- 3. Update order_site_submissions table if it has inclusion_status column
-- Set default for future inserts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'order_site_submissions' 
    AND column_name = 'inclusion_status'
  ) THEN
    -- Update existing NULL values to 'included'
    UPDATE order_site_submissions
    SET inclusion_status = 'included'
    WHERE inclusion_status IS NULL;
    
    -- Set column default for future inserts
    ALTER TABLE order_site_submissions 
    ALTER COLUMN inclusion_status SET DEFAULT 'included';
  END IF;
END $$;

-- 4. Add a comment explaining the default behavior
COMMENT ON COLUMN order_line_items.metadata IS 
'JSONB metadata for line item. inclusionStatus defaults to "included" for better UX. Valid values: included, excluded, saved_for_later';

COMMIT;

-- Verification query (run after migration):
-- SELECT 
--   COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'included') as included,
--   COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'excluded') as excluded,
--   COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'saved_for_later') as saved,
--   COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' IS NULL) as null_status
-- FROM order_line_items;