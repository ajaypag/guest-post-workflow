-- Migration: Add workflow assignment tracking fields
-- File: 0063_add_workflow_assignment_tracking.sql
-- Date: 2025-08-21
-- Purpose: Add assignment and performance tracking to workflows table

-- Add assignment tracking columns to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN workflows.assigned_user_id IS 'ID of user assigned to work on this workflow';
COMMENT ON COLUMN workflows.assigned_at IS 'Timestamp when workflow was assigned to current user';
COMMENT ON COLUMN workflows.last_active_at IS 'Timestamp of last activity on this workflow';
COMMENT ON COLUMN workflows.estimated_completion_date IS 'Estimated completion date based on workload and complexity';

-- Create indexes for performance (assignment queries are common)
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_user_id ON workflows(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_at ON workflows(assigned_at);
CREATE INDEX IF NOT EXISTS idx_workflows_last_active_at ON workflows(last_active_at);
CREATE INDEX IF NOT EXISTS idx_workflows_estimated_completion_date ON workflows(estimated_completion_date);

-- Update existing workflows to set last_active_at to updated_at if not set
UPDATE workflows 
SET last_active_at = updated_at 
WHERE last_active_at IS NULL AND updated_at IS NOT NULL;

-- Log migration completion
INSERT INTO migrations (id, name, executed_at) 
VALUES (63, '0063_add_workflow_assignment_tracking', NOW())
ON CONFLICT (id) DO NOTHING;