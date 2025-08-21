-- Migration: Add publisher coordination fields
-- File: 0064_add_publisher_coordination_fields.sql
-- Date: 2025-08-21
-- Purpose: Add publisher communication and QA tracking to workflows table

-- Add publisher coordination columns to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS publisher_email VARCHAR(255);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS publisher_pre_approval_sent_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS publisher_pre_approval_status VARCHAR(50);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS publisher_final_sent_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_url VARCHAR(500);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS publication_verified_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS qa_checklist_completed BOOLEAN DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS payment_authorized BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN workflows.publisher_email IS 'Email address of publisher/blogger for coordination';
COMMENT ON COLUMN workflows.publisher_pre_approval_sent_at IS 'When pre-approval email was sent to publisher';
COMMENT ON COLUMN workflows.publisher_pre_approval_status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN workflows.publisher_final_sent_at IS 'When final article was sent to publisher';
COMMENT ON COLUMN workflows.published_url IS 'URL where article was actually published';
COMMENT ON COLUMN workflows.publication_verified_at IS 'When publication was verified and QA completed';
COMMENT ON COLUMN workflows.qa_checklist_completed IS 'True when all QA checks pass';
COMMENT ON COLUMN workflows.payment_authorized IS 'True when payment to publisher is authorized';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_publisher_email ON workflows(publisher_email);
CREATE INDEX IF NOT EXISTS idx_workflows_publisher_pre_approval_status ON workflows(publisher_pre_approval_status);
CREATE INDEX IF NOT EXISTS idx_workflows_qa_checklist_completed ON workflows(qa_checklist_completed);
CREATE INDEX IF NOT EXISTS idx_workflows_payment_authorized ON workflows(payment_authorized);
CREATE INDEX IF NOT EXISTS idx_workflows_published_url ON workflows(published_url) WHERE published_url IS NOT NULL;

-- Set default values for existing workflows
UPDATE workflows 
SET publisher_pre_approval_status = 'pending'
WHERE publisher_pre_approval_status IS NULL;

UPDATE workflows 
SET qa_checklist_completed = false
WHERE qa_checklist_completed IS NULL;

UPDATE workflows 
SET payment_authorized = false
WHERE payment_authorized IS NULL;

-- Log migration completion
INSERT INTO migrations (id, name, executed_at) 
VALUES (64, '0064_add_publisher_coordination_fields', NOW())
ON CONFLICT (id) DO NOTHING;