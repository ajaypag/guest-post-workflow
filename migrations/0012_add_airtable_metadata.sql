-- Add Airtable integration columns to bulk_analysis_domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS airtable_record_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtable_metadata JSONB,
ADD COLUMN IF NOT EXISTS airtable_last_synced TIMESTAMP;

-- Create index for efficient lookups by Airtable record ID
CREATE INDEX IF NOT EXISTS idx_bulk_domains_airtable_id 
ON bulk_analysis_domains(airtable_record_id);

-- Create index for JSONB queries on metadata
CREATE INDEX IF NOT EXISTS idx_bulk_domains_airtable_metadata 
ON bulk_analysis_domains USING GIN (airtable_metadata);

COMMENT ON COLUMN bulk_analysis_domains.airtable_record_id IS 'Airtable record ID for this domain';
COMMENT ON COLUMN bulk_analysis_domains.airtable_metadata IS 'Cached metadata from Airtable including DR, traffic, categories, etc.';
COMMENT ON COLUMN bulk_analysis_domains.airtable_last_synced IS 'Last time this record was synced with Airtable';