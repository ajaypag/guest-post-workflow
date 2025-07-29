-- Create project_websites table for direct website-project associations
CREATE TABLE IF NOT EXISTS project_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analysis_status VARCHAR(50) DEFAULT 'pending',
  dataforseo_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate website in same project
  UNIQUE(project_id, website_id)
);

-- Create indexes for performance
CREATE INDEX idx_project_websites_project_id ON project_websites(project_id);
CREATE INDEX idx_project_websites_website_id ON project_websites(website_id);
CREATE INDEX idx_project_websites_status ON project_websites(analysis_status);
CREATE INDEX idx_project_websites_added_by ON project_websites(added_by);

-- Create workflow_websites table for tracking website usage in workflows
CREATE TABLE IF NOT EXISTS workflow_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  step_added VARCHAR(100) NOT NULL,
  usage_type VARCHAR(50) NOT NULL, -- 'competitor', 'link_target', 'mention', etc.
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Allow same website to be used in different steps/ways
  UNIQUE(workflow_id, website_id, step_added, usage_type)
);

-- Create indexes
CREATE INDEX idx_workflow_websites_workflow_id ON workflow_websites(workflow_id);
CREATE INDEX idx_workflow_websites_website_id ON workflow_websites(website_id);
CREATE INDEX idx_workflow_websites_usage_type ON workflow_websites(usage_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_websites_updated_at
  BEFORE UPDATE ON project_websites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();