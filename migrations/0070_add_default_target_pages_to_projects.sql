-- Add default target page IDs for bulk analysis projects
-- These are the target pages that should be pre-selected when adding domains
ALTER TABLE bulk_analysis_projects 
ADD COLUMN default_target_page_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN bulk_analysis_projects.default_target_page_ids IS 'Target page IDs to pre-select when adding domains for analysis';