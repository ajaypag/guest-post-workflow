-- Add target page hash column for duplicate detection change tracking
-- This enables detection of when target URLs change, triggering re-analysis
-- Part of: Duplicate Detection Enhancement (Phase 1)

-- Add target page hash column
ALTER TABLE bulk_analysis_domains 
ADD COLUMN target_page_hash VARCHAR(32);

-- Create index for performance
CREATE INDEX idx_bulk_domains_target_hash ON bulk_analysis_domains(target_page_hash);

-- Backfill existing data with NULL-safe logic
-- This creates a hash of sorted target page IDs for change detection
UPDATE bulk_analysis_domains 
SET target_page_hash = MD5(
  CASE 
    WHEN target_page_ids IS NULL OR target_page_ids::text = '[]' THEN ''
    ELSE (
      SELECT COALESCE(string_agg(value, '|' ORDER BY value), '')
      FROM jsonb_array_elements_text(target_page_ids) AS value
    )
  END
)
WHERE target_page_hash IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN bulk_analysis_domains.target_page_hash IS 'MD5 hash of sorted target page IDs for detecting when targets change and analysis needs to be re-run';