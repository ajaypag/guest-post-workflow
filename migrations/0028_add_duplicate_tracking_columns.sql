-- Migration 0028: Add duplicate tracking columns for bulk analysis domains
-- This is a non-breaking change that adds tracking columns for duplicate resolution
-- while keeping the existing unique constraint intact

-- Step 1: Add columns for duplicate tracking and resolution history
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES bulk_analysis_domains(id),
ADD COLUMN IF NOT EXISTS duplicate_resolution VARCHAR(50) CHECK (duplicate_resolution IN ('keep_both', 'move_to_new', 'skip', 'update_original')),
ADD COLUMN IF NOT EXISTS duplicate_resolved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS duplicate_resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES bulk_analysis_projects(id),
ADD COLUMN IF NOT EXISTS resolution_metadata JSONB;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_domains_duplicate_of ON bulk_analysis_domains(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_resolution ON bulk_analysis_domains(duplicate_resolution);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_original_project ON bulk_analysis_domains(original_project_id);

-- Step 3: Add comment to document the duplicate resolution values
COMMENT ON COLUMN bulk_analysis_domains.duplicate_resolution IS 'Resolution action taken: keep_both (domain exists in multiple projects), move_to_new (removed from original project), skip (not added to new project), update_original (original entry updated)';
COMMENT ON COLUMN bulk_analysis_domains.duplicate_of IS 'References the original domain entry if this is a duplicate';
COMMENT ON COLUMN bulk_analysis_domains.original_project_id IS 'Tracks the original project when domain was moved';
COMMENT ON COLUMN bulk_analysis_domains.resolution_metadata IS 'JSON metadata about the resolution process including conflict details';

-- Note: The existing unique constraint (clientId, domain) remains in place
-- This will be changed in a future migration after the resolution system is fully tested