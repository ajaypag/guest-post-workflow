-- Create a table to track ALL keyword searches, even those with zero results
-- This prevents repeated API calls for keywords that return no rankings

CREATE TABLE IF NOT EXISTS keyword_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2840,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  has_results BOOLEAN NOT NULL DEFAULT FALSE,
  searched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(bulk_analysis_domain_id, keyword, location_code, language_code)
);

-- Create indexes for performance
CREATE INDEX idx_keyword_search_history_domain ON keyword_search_history(bulk_analysis_domain_id);
CREATE INDEX idx_keyword_search_history_searched_at ON keyword_search_history(searched_at);

-- Add comment
COMMENT ON TABLE keyword_search_history IS 'Tracks all keyword searches including those with zero results to prevent duplicate API calls';