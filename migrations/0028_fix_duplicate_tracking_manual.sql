-- Manual SQL to fix duplicate tracking issues
-- Run this if the automated migration fails

-- Step 1: Drop the old constraint that's causing issues
ALTER TABLE bulk_analysis_domains 
DROP CONSTRAINT IF EXISTS idx_bulk_analysis_domains_client_domain;

-- Also drop if it exists as an index
DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_domain;

-- Step 2: Add the missing columns
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES bulk_analysis_domains(id),
ADD COLUMN IF NOT EXISTS duplicate_resolution VARCHAR(50) CHECK (duplicate_resolution IN ('keep_both', 'move_to_new', 'skip', 'update_original')),
ADD COLUMN IF NOT EXISTS duplicate_resolved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS duplicate_resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES bulk_analysis_projects(id),
ADD COLUMN IF NOT EXISTS resolution_metadata JSONB;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_domains_duplicate_of ON bulk_analysis_domains(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_resolution ON bulk_analysis_domains(duplicate_resolution);
CREATE INDEX IF NOT EXISTS idx_bulk_domains_original_project ON bulk_analysis_domains(original_project_id);

-- Step 4: Create the new unique constraint that allows duplicates across projects
CREATE UNIQUE INDEX IF NOT EXISTS uk_bulk_analysis_domains_client_domain_project 
ON bulk_analysis_domains(client_id, domain, project_id);

-- Step 5: Verify the changes
SELECT 
  'Columns added' as check_type,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'bulk_analysis_domains' 
AND column_name IN ('duplicate_of', 'duplicate_resolution', 'duplicate_resolved_by', 'duplicate_resolved_at', 'original_project_id', 'resolution_metadata')
UNION ALL
SELECT 
  'Old constraint removed' as check_type,
  CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END as count
FROM pg_constraint 
WHERE conname = 'idx_bulk_analysis_domains_client_domain'
UNION ALL
SELECT 
  'New constraint added' as check_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE indexname = 'uk_bulk_analysis_domains_client_domain_project';