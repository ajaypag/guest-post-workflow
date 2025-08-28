-- Migration: 0074_share_token_email_support.sql
-- Purpose: Add email support for share token functionality
-- Feature: Enable sending rich email notifications when share tokens are generated
-- Date: 2025-08-27

-- Add email fields to vetted_sites_requests for share token email functionality
ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  share_recipient_email VARCHAR(255);

ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  share_recipient_name VARCHAR(255);

ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  share_custom_message TEXT;

ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  share_email_sent_at TIMESTAMP;

-- Add index for email tracking queries
CREATE INDEX IF NOT EXISTS idx_vetted_requests_share_email 
  ON vetted_sites_requests(share_recipient_email) 
  WHERE share_recipient_email IS NOT NULL;

-- Add index for share email sent tracking
CREATE INDEX IF NOT EXISTS idx_vetted_requests_share_email_sent 
  ON vetted_sites_requests(share_email_sent_at) 
  WHERE share_email_sent_at IS NOT NULL;

-- Note: Email logging will use existing email_logs table
-- Note: Unsubscribe functionality will be added later if needed