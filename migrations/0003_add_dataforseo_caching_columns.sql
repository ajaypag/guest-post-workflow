-- Add columns for smart caching of DataForSEO results
-- This migration adds tracking for searched keywords and analysis batches

-- Add columns to bulk_analysis_domains table
ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS dataforseo_searched_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dataforseo_last_full_analysis_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dataforseo_total_api_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dataforseo_incremental_api_calls INTEGER DEFAULT 0;

-- Add columns to keyword_analysis_results table for batch tracking
ALTER TABLE keyword_analysis_results
ADD COLUMN IF NOT EXISTS analysis_batch_id UUID,
ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN DEFAULT FALSE;

-- Create index for faster keyword lookups
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_results_keyword_domain 
ON keyword_analysis_results(bulk_analysis_domain_id, keyword);

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_results_batch
ON keyword_analysis_results(analysis_batch_id, created_at DESC);