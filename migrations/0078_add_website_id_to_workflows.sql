-- Migration: Add website_id to workflows table for website selector integration
-- Date: 2025-08-29
-- Purpose: Replace manual domain text input with rich website selector

-- Add website_id column to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id);

-- Create index for performance on JOINs
CREATE INDEX IF NOT EXISTS idx_workflows_website_id ON workflows(website_id);

-- Add comment for documentation
COMMENT ON COLUMN workflows.website_id IS 'Foreign key to websites table for rich website data integration. Replaces manual domain text input.';

-- Note: Existing workflows will have NULL website_id (backward compatibility)
-- The domain field in step outputs will continue to work as fallback