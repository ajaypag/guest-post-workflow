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
CREATE INDEX IF NOT EXISTS idx_bulk_projects_client ON bulk_analysis_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_bulk_projects_status ON bulk_analysis_projects(status);

-- Add project columns to bulk_analysis_domains if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'bulk_analysis_domains' 
                AND column_name = 'project_id') THEN
    ALTER TABLE bulk_analysis_domains 
    ADD COLUMN project_id UUID REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE,
    ADD COLUMN project_added_at TIMESTAMP;
  END IF;
END $$;

-- Create index for project_id if not exists
CREATE INDEX IF NOT EXISTS idx_bulk_domains_project ON bulk_analysis_domains(project_id);

-- Add bulkAnalysisProjectId to order_groups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'order_groups' 
                AND column_name = 'bulk_analysis_project_id') THEN
    ALTER TABLE order_groups 
    ADD COLUMN bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id);
  END IF;
END $$;