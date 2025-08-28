-- Migration: Add task assignment columns to client_brand_intelligence table
-- This adds support for assigning brand intelligence tasks to specific users

ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Add indexes for performance on assignment queries
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_assigned_to 
ON client_brand_intelligence(assigned_to);

CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_assigned_at 
ON client_brand_intelligence(assigned_at);

-- Add comment to document the purpose
COMMENT ON COLUMN client_brand_intelligence.assigned_to IS 'User ID of the person assigned to work on this brand intelligence task';
COMMENT ON COLUMN client_brand_intelligence.assigned_at IS 'Timestamp when the task was assigned';
COMMENT ON COLUMN client_brand_intelligence.assignment_notes IS 'Notes about the assignment or special instructions';