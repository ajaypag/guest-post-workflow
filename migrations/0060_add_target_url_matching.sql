-- Add target URL matching fields to bulk_analysis_domains
-- This migration adds fields needed for AI target URL matching functionality
-- Date: 2025-08-19

-- Add target URL matching columns to bulk_analysis_domains table
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS suggested_target_url TEXT,
ADD COLUMN IF NOT EXISTS target_match_data JSONB,
ADD COLUMN IF NOT EXISTS target_matched_at TIMESTAMP;

-- Create index on suggested_target_url for faster lookups when assigning domains to orders
CREATE INDEX IF NOT EXISTS idx_bulk_domains_suggested_target 
ON bulk_analysis_domains(suggested_target_url) 
WHERE suggested_target_url IS NOT NULL;

-- Create index on target_matched_at for tracking when matching was performed
CREATE INDEX IF NOT EXISTS idx_bulk_domains_target_matched_at 
ON bulk_analysis_domains(target_matched_at) 
WHERE target_matched_at IS NOT NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN bulk_analysis_domains.suggested_target_url IS 'AI-suggested best target URL for this domain';
COMMENT ON COLUMN bulk_analysis_domains.target_match_data IS 'Full AI target URL analysis results with match quality and evidence';
COMMENT ON COLUMN bulk_analysis_domains.target_matched_at IS 'Timestamp when target URL matching was last performed';