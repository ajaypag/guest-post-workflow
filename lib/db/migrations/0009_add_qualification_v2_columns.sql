-- Add new columns for AI qualification v2
ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS overlap_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS authority_direct VARCHAR(20),
ADD COLUMN IF NOT EXISTS authority_related VARCHAR(20),
ADD COLUMN IF NOT EXISTS topic_scope VARCHAR(20),
ADD COLUMN IF NOT EXISTS topic_reasoning TEXT,
ADD COLUMN IF NOT EXISTS evidence JSONB;

-- Update existing average_quality to marginal_quality
UPDATE bulk_analysis_domains
SET qualification_status = 'marginal_quality'
WHERE qualification_status = 'average_quality';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bulk_domains_overlap_status ON bulk_analysis_domains(overlap_status);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_topic_scope ON bulk_analysis_domains(topic_scope);