-- Add multi-tier qualification and workflow tracking to bulk_analysis_domains
-- Also add indexes for better performance with pagination and filtering

-- Update qualification status to support high/average quality targets
-- Note: We're not changing the column type, just documenting the new values:
-- 'pending', 'high_quality', 'average_quality', 'disqualified'

-- Add workflow tracking
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS has_workflow BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS workflow_id UUID,
ADD COLUMN IF NOT EXISTS workflow_created_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_id 
ON bulk_analysis_domains(client_id);

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_qualification_status 
ON bulk_analysis_domains(qualification_status);

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_has_workflow 
ON bulk_analysis_domains(has_workflow);

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_domain 
ON bulk_analysis_domains(domain);

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_created_at 
ON bulk_analysis_domains(created_at DESC);

-- Add composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_status_workflow 
ON bulk_analysis_domains(client_id, qualification_status, has_workflow);