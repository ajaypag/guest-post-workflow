-- Migration: Add Shadow Publisher Support to Publishers Table
-- Purpose: Enable creation of "shadow" publishers from email responses before they create accounts
-- Date: 2025-08-18

-- Step 1: Add shadow publisher support fields to publishers table
ALTER TABLE publishers 
  -- Account status tracking
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'unclaimed',
  -- Track where this publisher came from
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  -- Store metadata about the source (e.g., ManyReach campaign ID)
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
  -- When the account was claimed
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
  
  -- Invitation system fields
  ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP,
  
  -- Confidence scoring for AI-extracted data
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
  
  -- Claim verification fields
  ADD COLUMN IF NOT EXISTS claim_verification_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS claim_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_attempt TIMESTAMP;

-- Step 2: Make authentication fields nullable for shadow publishers
-- Shadow publishers don't have passwords until they claim their account
ALTER TABLE publishers 
  ALTER COLUMN password DROP NOT NULL,
  ALTER COLUMN contact_name SET DEFAULT 'Unknown';

-- Step 3: Update existing publishers account status based on current data
UPDATE publishers 
SET account_status = CASE 
  WHEN email = 'internal@system.local' THEN 'system'
  WHEN password IS NOT NULL THEN 'active'
  ELSE 'unclaimed'
END
WHERE account_status IS NULL;

-- Step 4: Create conditional unique index for email
-- Only enforce uniqueness for active accounts, allow multiple unclaimed with same email
DROP INDEX IF EXISTS idx_publishers_email;
ALTER TABLE publishers DROP CONSTRAINT IF EXISTS publishers_email_key CASCADE;

CREATE UNIQUE INDEX idx_publishers_email_active 
  ON publishers(LOWER(email)) 
  WHERE account_status NOT IN ('unclaimed', 'shadow');

-- Step 5: Add performance indexes for shadow publisher operations
CREATE INDEX IF NOT EXISTS idx_publishers_account_status ON publishers(account_status);
CREATE INDEX IF NOT EXISTS idx_publishers_source ON publishers(source);
CREATE INDEX IF NOT EXISTS idx_publishers_invitation_token ON publishers(invitation_token) 
  WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publishers_confidence_score ON publishers(confidence_score) 
  WHERE confidence_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publishers_claimed_at ON publishers(claimed_at) 
  WHERE claimed_at IS NOT NULL;

-- Step 6: Add check constraints for data integrity
ALTER TABLE publishers 
  ADD CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ADD CONSTRAINT chk_claim_attempts CHECK (claim_attempts >= 0),
  ADD CONSTRAINT chk_account_status CHECK (account_status IN ('unclaimed', 'shadow', 'active', 'system', 'suspended', 'blocked'));

-- Step 7: Add comment documentation
COMMENT ON COLUMN publishers.account_status IS 'Account status: unclaimed (shadow publisher), active (claimed), system (internal), suspended, blocked';
COMMENT ON COLUMN publishers.source IS 'Where this publisher was created from: manual, manyreach, import, api';
COMMENT ON COLUMN publishers.source_metadata IS 'JSON metadata about the source (e.g., campaign_id, webhook_id)';
COMMENT ON COLUMN publishers.confidence_score IS 'AI confidence score for extracted data (0-1)';
COMMENT ON COLUMN publishers.invitation_token IS 'Secure token for claiming account via email invitation';
COMMENT ON COLUMN publishers.claim_verification_code IS '6-digit code sent via email for claim verification';

-- Step 8: Create audit trigger for tracking status changes
CREATE OR REPLACE FUNCTION log_publisher_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO publisher_automation_logs (
      publisher_id,
      action,
      previous_data,
      new_data,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object('account_status', OLD.account_status),
      jsonb_build_object('account_status', NEW.account_status),
      jsonb_build_object(
        'changed_from', OLD.account_status,
        'changed_to', NEW.account_status,
        'trigger', 'database'
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'publisher_status_change_trigger'
  ) THEN
    CREATE TRIGGER publisher_status_change_trigger
      AFTER UPDATE ON publishers
      FOR EACH ROW
      EXECUTE FUNCTION log_publisher_status_change();
  END IF;
END;
$$;