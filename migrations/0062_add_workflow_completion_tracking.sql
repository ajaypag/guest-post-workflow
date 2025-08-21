-- Migration: Add workflow completion tracking fields
-- File: 0062_add_workflow_completion_tracking.sql
-- Date: 2025-08-21
-- Purpose: Add flexible progress tracking to workflows table

-- Add completion tracking columns to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_step_completed_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN workflows.completion_percentage IS 'Percentage of workflow steps completed (0-100)';
COMMENT ON COLUMN workflows.is_completed IS 'True when all workflow steps are completed';
COMMENT ON COLUMN workflows.completed_at IS 'Timestamp when workflow was marked as completed';
COMMENT ON COLUMN workflows.last_step_completed_at IS 'Timestamp of most recent step completion';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_completion_percentage ON workflows(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_workflows_is_completed ON workflows(is_completed);
CREATE INDEX IF NOT EXISTS idx_workflows_completed_at ON workflows(completed_at);

-- Update existing workflows to have 0% completion if not already set
UPDATE workflows 
SET completion_percentage = 0 
WHERE completion_percentage IS NULL;

-- Log migration completion
INSERT INTO migrations (id, name, executed_at) 
VALUES (62, '0062_add_workflow_completion_tracking', NOW())
ON CONFLICT (id) DO NOTHING;