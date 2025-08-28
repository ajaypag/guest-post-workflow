-- Migration: Add target_page_id to workflows table
-- Purpose: Create a direct foreign key relationship between workflows and target_pages
-- Date: 2024-02-28

-- Add target_page_id column to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS target_page_id UUID REFERENCES target_pages(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_target_page_id ON workflows(target_page_id);

-- Add comment to document the field
COMMENT ON COLUMN workflows.target_page_id IS 'Direct reference to the target page this workflow is creating content for';

-- Note: We're not making this NOT NULL initially because existing workflows don't have this data
-- We'll populate it gradually as workflows are created or updated