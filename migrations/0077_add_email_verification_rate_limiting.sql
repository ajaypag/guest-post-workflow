-- Migration: Add rate limiting columns for email verification
-- Created: 2025-08-29
-- Purpose: Prevent email spam attacks by tracking verification attempts

-- Add columns for rate limiting to publisher_email_claims table
ALTER TABLE publisher_email_claims
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_publisher_email_claims_rate_limit 
ON publisher_email_claims(publisher_id, website_id, verification_sent_at);

-- Add comment explaining the columns
COMMENT ON COLUMN publisher_email_claims.attempt_count IS 'Number of verification attempts in current period';
COMMENT ON COLUMN publisher_email_claims.last_attempt_at IS 'Timestamp of the last verification attempt';
COMMENT ON COLUMN publisher_email_claims.daily_reset_at IS 'When the daily attempt counter should reset';