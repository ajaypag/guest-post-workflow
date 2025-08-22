-- Migration 0064: Add publisher coordination fields
-- Adds fields for tracking publisher communication, QA, and payment authorization
-- Date: 2025-01-22

-- Publisher communication tracking
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS publisher_email VARCHAR(255);

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS publisher_pre_approval_sent_at TIMESTAMP;

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS publisher_pre_approval_status VARCHAR(50) 
  CHECK (publisher_pre_approval_status IN ('pending', 'approved', 'rejected', 'revision_requested'));

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS publisher_final_sent_at TIMESTAMP;

-- Publication tracking
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS published_url VARCHAR(500);

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS publication_verified_at TIMESTAMP;

-- QA and payment tracking
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS qa_checklist_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS payment_authorized BOOLEAN DEFAULT FALSE;

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS payment_authorized_at TIMESTAMP;

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);

-- Add comments for documentation
COMMENT ON COLUMN workflows.publisher_email IS 'Email address of the publisher/blogger';
COMMENT ON COLUMN workflows.publisher_pre_approval_sent_at IS 'When pre-approval request was sent to publisher';
COMMENT ON COLUMN workflows.publisher_pre_approval_status IS 'Status of publisher pre-approval';
COMMENT ON COLUMN workflows.publisher_final_sent_at IS 'When final article was sent to publisher';
COMMENT ON COLUMN workflows.published_url IS 'URL where the guest post was published';
COMMENT ON COLUMN workflows.publication_verified_at IS 'When publication was verified and QA completed';
COMMENT ON COLUMN workflows.qa_checklist_completed IS 'Whether all QA checks have passed';
COMMENT ON COLUMN workflows.payment_authorized IS 'Whether payment to publisher has been authorized';
COMMENT ON COLUMN workflows.payment_authorized_at IS 'When payment was authorized';
COMMENT ON COLUMN workflows.payment_amount IS 'Amount to be paid to publisher';
