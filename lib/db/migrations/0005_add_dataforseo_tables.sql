-- Create keyword analysis results table for storing DataForSEO results
CREATE TABLE IF NOT EXISTS keyword_analysis_results (
  id UUID PRIMARY KEY,
  bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position INTEGER NOT NULL,
  search_volume INTEGER,
  url TEXT NOT NULL,
  keyword_difficulty INTEGER,
  cpc DECIMAL(10, 2),
  competition VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'
  location_code INTEGER NOT NULL DEFAULT 2840, -- 2840 = United States
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  analysis_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_keyword_analysis_domain ON keyword_analysis_results(bulk_analysis_domain_id);
CREATE INDEX idx_keyword_analysis_position ON keyword_analysis_results(position);
CREATE INDEX idx_keyword_analysis_volume ON keyword_analysis_results(search_volume);

-- Create batch tracking table for DataForSEO analysis requests
CREATE TABLE IF NOT EXISTS keyword_analysis_batches (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_code INTEGER NOT NULL DEFAULT 2840,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_domains INTEGER NOT NULL DEFAULT 0,
  processed_domains INTEGER NOT NULL DEFAULT 0,
  total_keywords_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Add DataForSEO analysis status to bulk_analysis_domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS dataforseo_status VARCHAR(50) DEFAULT 'not_analyzed',
ADD COLUMN IF NOT EXISTS dataforseo_keywords_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dataforseo_analyzed_at TIMESTAMP;

-- Create index for DataForSEO status
CREATE INDEX idx_bulk_analysis_dataforseo_status ON bulk_analysis_domains(dataforseo_status);