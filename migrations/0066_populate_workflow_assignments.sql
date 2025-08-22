-- Migration 0066: Populate workflow assignments
-- Sets assigned_user_id to user_id (creator) for all existing workflows
-- Date: 2025-01-22

-- Populate assigned_user_id with the creator's ID for all workflows where it's NULL
UPDATE workflows 
SET assigned_user_id = user_id
WHERE assigned_user_id IS NULL;

-- Add index for performance when filtering by assigned_user_id
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_user ON workflows(assigned_user_id);

-- Add comment for documentation
COMMENT ON COLUMN workflows.assigned_user_id IS 'User currently assigned to work on this workflow (defaults to creator)';