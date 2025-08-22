-- Migration 0063: Add workflow assignment tracking fields
-- Adds user assignment and estimation fields to workflows table
-- Date: 2025-01-22

-- Add assigned user tracking
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id);

-- Add assignment timestamp
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Add estimated completion date
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP;

-- Create index for assigned user lookups
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_user_id ON workflows(assigned_user_id);

-- Add comments for documentation
COMMENT ON COLUMN workflows.assigned_user_id IS 'User currently assigned to work on this workflow';
COMMENT ON COLUMN workflows.assigned_at IS 'Timestamp when workflow was assigned to current user';
COMMENT ON COLUMN workflows.estimated_completion_date IS 'Estimated date when workflow will be completed';
