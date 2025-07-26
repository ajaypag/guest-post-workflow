-- Migration to make projectId required in bulk_analysis_domains
-- First ensure all orphaned domains have been assigned to projects

-- Create default projects for any clients that have orphaned domains
INSERT INTO bulk_analysis_projects (client_id, name, description, icon, created_at, updated_at)
SELECT DISTINCT 
  client_id,
  'Default Project',
  'Automatically created for existing domains',
  '📁',
  NOW(),
  NOW()
FROM bulk_analysis_domains
WHERE project_id IS NULL
ON CONFLICT DO NOTHING;

-- Assign orphaned domains to their default projects
UPDATE bulk_analysis_domains d
SET 
  project_id = p.id,
  project_added_at = NOW(),
  updated_at = NOW()
FROM bulk_analysis_projects p
WHERE d.project_id IS NULL
  AND d.client_id = p.client_id
  AND p.name = 'Default Project';

-- Update project stats for default projects
UPDATE bulk_analysis_projects p
SET 
  domain_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d WHERE d.project_id = p.id
  ),
  qualified_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d 
    WHERE d.project_id = p.id 
    AND d.qualification_status IN ('high_quality', 'average_quality')
  ),
  workflow_count = (
    SELECT COUNT(*) FROM bulk_analysis_domains d 
    WHERE d.project_id = p.id 
    AND d.has_workflow = true
  ),
  last_activity_at = NOW(),
  updated_at = NOW()
WHERE p.name = 'Default Project';

-- Now make project_id NOT NULL
ALTER TABLE bulk_analysis_domains 
ALTER COLUMN project_id SET NOT NULL;