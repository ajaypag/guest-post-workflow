-- Migration 0062: Add workflow completion tracking fields
-- Adds percentage completion and completion status tracking to workflows table
-- Date: 2025-01-22

-- Add completion percentage field (0-100)
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Add completion status flag
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Add completion timestamp
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add last step completed timestamp for tracking progress
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS last_step_completed_at TIMESTAMP;

-- Add last active timestamp for tracking recent activity
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_is_completed ON workflows(is_completed);
CREATE INDEX IF NOT EXISTS idx_workflows_completion_percentage ON workflows(completion_percentage);

-- Add comment for documentation
COMMENT ON COLUMN workflows.completion_percentage IS 'Percentage of workflow steps completed (0-100)';
COMMENT ON COLUMN workflows.is_completed IS 'Whether all workflow steps are completed';
COMMENT ON COLUMN workflows.completed_at IS 'Timestamp when workflow was fully completed';
COMMENT ON COLUMN workflows.last_step_completed_at IS 'Timestamp of the most recently completed step';
COMMENT ON COLUMN workflows.last_active_at IS 'Timestamp of last activity on this workflow';
