-- Create bulk_analysis_projects table
CREATE TABLE IF NOT EXISTS bulk_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  auto_apply_keywords JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  domain_count INTEGER DEFAULT 0,
  qualified_count INTEGER DEFAULT 0,
  workflow_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bulk_projects_client ON bulk_analysis_projects(client_id);
CREATE INDEX idx_bulk_projects_status ON bulk_analysis_projects(status);

-- Add project columns to bulk_analysis_domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS project_added_at TIMESTAMP;

-- Create index for project_id
CREATE INDEX IF NOT EXISTS idx_bulk_domains_project ON bulk_analysis_domains(project_id);

-- Create a default project for each client that has existing domains
INSERT INTO bulk_analysis_projects (client_id, name, description, icon, created_at, updated_at)
SELECT DISTINCT 
  client_id,
  'Imported Domains',
  'Domains imported before project system',
  '📥',
  NOW(),
  NOW()
FROM bulk_analysis_domains
WHERE project_id IS NULL
ON CONFLICT DO NOTHING;

-- Update existing domains to use the default project
UPDATE bulk_analysis_domains d
SET 
  project_id = p.id,
  project_added_at = d.created_at
FROM bulk_analysis_projects p
WHERE d.project_id IS NULL
  AND d.client_id = p.client_id
  AND p.name = 'Imported Domains';

-- Update project stats for the imported projects
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
  last_activity_at = (
    SELECT MAX(updated_at) FROM bulk_analysis_domains d WHERE d.project_id = p.id
  )
WHERE p.name = 'Imported Domains';