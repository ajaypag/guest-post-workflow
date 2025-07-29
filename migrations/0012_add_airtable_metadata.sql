-- Add Airtable metadata columns to bulk_analysis_domains table
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS airtable_record_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS airtable_metadata JSONB,
ADD COLUMN IF NOT EXISTS airtable_last_synced TIMESTAMP;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_airtable_record_id 
ON bulk_analysis_domains(airtable_record_id);