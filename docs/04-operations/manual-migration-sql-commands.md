# Manual SQL Migration Commands for Production

## Overview
This document contains all SQL commands needed to migrate production database from `bug-fixing` branch state to `order-flow-rollback` branch state. Execute these commands in the **exact order** provided.

## Pre-Migration Setup

### 1. Connect to Production Database
```bash
# Set your database connection variables
export DB_HOST="your-production-host"
export DB_PORT="5432"
export DB_USER="your-db-user" 
export DB_NAME="your-database-name"

# Connect to database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

### 2. Create Database Backup (CRITICAL)
```sql
-- Run this BEFORE starting migrations
-- Replace with your backup strategy
```

```bash
# From command line (recommended)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > production_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Migration Commands (Execute in Order)

### Phase 1: Foundation Migrations

#### Migration 1: `0054_fix_multiple_offerings_per_website.sql`
```sql
-- Migration: Fix Multiple Offerings Per Website
-- Date: 2025-08-18
-- Description: Allow publishers to have multiple offerings for the same website

BEGIN;

-- First, remove the existing constraint
ALTER TABLE publisher_offering_relationships 
DROP CONSTRAINT IF EXISTS publisher_offering_relationships_publisher_id_website_id_key;

-- Add a new constraint that allows multiple offerings per website
-- but prevents duplicates of the same offering
ALTER TABLE publisher_offering_relationships 
ADD CONSTRAINT publisher_offering_relationships_unique_offering 
UNIQUE (publisher_id, website_id, offering_id);

-- Add a comment explaining the new constraint
COMMENT ON CONSTRAINT publisher_offering_relationships_unique_offering 
ON publisher_offering_relationships IS 
'Allows multiple offerings per publisher-website pair, but prevents duplicate offering relationships';

COMMIT;
```

#### Migration 2: `0055_shadow_publisher_support.sql`
```sql
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
```

#### Migration 3: `0056_email_processing_infrastructure.sql`
```sql
-- Migration: Email Processing Infrastructure for ManyReach Integration
-- Purpose: Create tables for processing and tracking email responses from publishers
-- Date: 2025-08-18

-- Step 1: Email processing logs for ManyReach webhooks
CREATE TABLE IF NOT EXISTS email_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook identification
  webhook_id VARCHAR(255),
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  campaign_type VARCHAR(50), -- outreach, follow_up, bulk
  
  -- Email metadata
  email_from VARCHAR(255) NOT NULL,
  email_to VARCHAR(255),
  email_subject VARCHAR(500),
  email_message_id VARCHAR(255),
  received_at TIMESTAMP,
  
  -- Content
  raw_content TEXT NOT NULL,
  html_content TEXT,
  
  -- AI parsing results
  parsed_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2),
  parsing_errors TEXT[],
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, parsed, failed, reviewed
  error_message TEXT,
  processed_at TIMESTAMP,
  processing_duration_ms INTEGER,
  
  -- Thread tracking
  thread_id VARCHAR(255),
  reply_count INTEGER DEFAULT 0,
  is_auto_reply BOOLEAN DEFAULT FALSE,
  original_outreach_id UUID REFERENCES email_processing_logs(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Email review queue for manual processing
CREATE TABLE IF NOT EXISTS email_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID NOT NULL REFERENCES email_processing_logs(id),
  
  -- Review metadata
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  reason VARCHAR(100), -- parsing_failed, low_confidence, manual_review_requested
  assigned_to VARCHAR(255),
  
  -- Review results
  review_status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, approved, rejected, needs_info
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),
  
  -- Actions taken
  actions_taken JSONB DEFAULT '[]',
  publisher_created BOOLEAN DEFAULT FALSE,
  publisher_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Email follow-ups tracking
CREATE TABLE IF NOT EXISTS email_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_email_id UUID NOT NULL REFERENCES email_processing_logs(id),
  publisher_id UUID,
  
  -- Follow-up scheduling
  follow_up_type VARCHAR(50), -- reminder, clarification, pricing_request
  scheduled_for TIMESTAMP,
  template_used VARCHAR(100),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, sent, bounced, replied, expired
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50),
  
  -- Response tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_email_id UUID REFERENCES email_processing_logs(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Publisher automation logs
CREATE TABLE IF NOT EXISTS publisher_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID,
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- created, invited, claimed, updated, suspended
  source VARCHAR(50), -- email_processing, manual, api, webhook
  trigger_event VARCHAR(100),
  
  -- Data changes
  previous_data JSONB DEFAULT '{}',
  new_data JSONB DEFAULT '{}',
  
  -- Automation context
  automated BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2),
  metadata JSONB DEFAULT '{}',
  
  -- Error handling
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_status ON email_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_campaign ON email_processing_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_from ON email_processing_logs(email_from);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_processed_at ON email_processing_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_thread ON email_processing_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_created_at ON email_processing_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_email_review_queue_status ON email_review_queue(review_status);
CREATE INDEX IF NOT EXISTS idx_email_review_queue_priority ON email_review_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_email_review_queue_assigned ON email_review_queue(assigned_to);

CREATE INDEX IF NOT EXISTS idx_email_follow_ups_scheduled ON email_follow_ups(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_follow_ups_publisher ON email_follow_ups(publisher_id);
CREATE INDEX IF NOT EXISTS idx_email_follow_ups_status ON email_follow_ups(status);

CREATE INDEX IF NOT EXISTS idx_publisher_automation_logs_publisher ON publisher_automation_logs(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_automation_logs_action ON publisher_automation_logs(action);
CREATE INDEX IF NOT EXISTS idx_publisher_automation_logs_created_at ON publisher_automation_logs(created_at);

-- Step 6: Add table comments
COMMENT ON TABLE email_processing_logs IS 'Logs of all email processing from ManyReach webhooks and other sources';
COMMENT ON TABLE email_review_queue IS 'Queue for emails requiring manual review and processing';
COMMENT ON TABLE email_follow_ups IS 'Automated and manual follow-up email tracking';
COMMENT ON TABLE publisher_automation_logs IS 'Audit trail of all automated and manual publisher actions';

-- Step 7: Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_processing_logs_updated_at 
    BEFORE UPDATE ON email_processing_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER email_review_queue_updated_at 
    BEFORE UPDATE ON email_review_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER email_follow_ups_updated_at 
    BEFORE UPDATE ON email_follow_ups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Shadow Publisher System Completion

#### Migration 4: `0058_webhook_security_logs.sql`
```sql
-- Migration: Add webhook security logs for ManyReach integration
-- Purpose: Track webhook security events and potential threats
-- Date: 2025-08-18

CREATE TABLE IF NOT EXISTS webhook_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request details
    request_ip VARCHAR(45) NOT NULL, -- Support IPv4 and IPv6
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    request_headers JSONB DEFAULT '{}',
    request_body_hash VARCHAR(64), -- SHA-256 hash of request body
    
    -- Security validation results
    security_check_passed BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    webhook_source VARCHAR(50), -- 'manyreach', 'stripe', 'external'
    
    -- Authentication details
    auth_header_present BOOLEAN DEFAULT FALSE,
    signature_valid BOOLEAN DEFAULT FALSE,
    timestamp_valid BOOLEAN DEFAULT FALSE,
    
    -- Response details
    response_status INTEGER,
    response_sent_at TIMESTAMP,
    
    -- Threat detection
    threat_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    blocked BOOLEAN DEFAULT FALSE,
    automated_action_taken VARCHAR(100), -- 'ip_blocked', 'rate_limited', 'flagged'
    
    -- Metadata
    user_agent TEXT,
    referrer VARCHAR(255),
    country_code VARCHAR(2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX idx_webhook_security_logs_ip ON webhook_security_logs(request_ip);
CREATE INDEX idx_webhook_security_logs_security_check ON webhook_security_logs(security_check_passed);
CREATE INDEX idx_webhook_security_logs_threat_level ON webhook_security_logs(threat_level);
CREATE INDEX idx_webhook_security_logs_blocked ON webhook_security_logs(blocked);
CREATE INDEX idx_webhook_security_logs_created_at ON webhook_security_logs(created_at);
CREATE INDEX idx_webhook_security_logs_source ON webhook_security_logs(webhook_source);

-- Add table comment
COMMENT ON TABLE webhook_security_logs IS 'Security audit log for all webhook requests and potential threats';
```

#### Migration 5: `0059_shadow_publisher_system.sql`
```sql
-- Shadow Publisher System - Missing Tables and Columns
-- This migration creates the infrastructure needed for the shadow publisher system

-- Create shadow_publisher_websites table
CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
    id VARCHAR(36) PRIMARY KEY,
    publisher_id VARCHAR(36) NOT NULL REFERENCES publishers(id),
    website_id VARCHAR(36) NOT NULL REFERENCES websites(id),
    confidence VARCHAR(10) NOT NULL,
    source VARCHAR(50) DEFAULT 'email_extraction',
    extraction_method VARCHAR(50) DEFAULT 'ai_extracted',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(publisher_id, website_id)
);

-- Add indexes for shadow_publisher_websites
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_publisher ON shadow_publisher_websites(publisher_id);
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_website ON shadow_publisher_websites(website_id);
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_verified ON shadow_publisher_websites(verified);

-- Add missing columns to publisher_websites (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_edit_pricing') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_edit_pricing BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_edit_availability') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_edit_availability BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_view_analytics') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_view_analytics BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add missing columns to publisher_offerings (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_available') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_available BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_price') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_days') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_days INTEGER;
    END IF;
END $$;

-- Add missing columns to email_processing_logs (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_processing_logs' AND column_name='sender_email') THEN
        ALTER TABLE email_processing_logs ADD COLUMN sender_email VARCHAR(255);
    END IF;
END $$;

-- Update timestamps trigger for shadow_publisher_websites
CREATE OR REPLACE FUNCTION update_shadow_publisher_websites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shadow_publisher_websites_update_timestamp
    BEFORE UPDATE ON shadow_publisher_websites
    FOR EACH ROW
    EXECUTE FUNCTION update_shadow_publisher_websites_timestamp();
```

#### Migration 6: `0061_add_sender_email_column.sql`
```sql
-- Migration: Add sender_email column to email_processing_logs
-- Purpose: Track sender email addresses for better email processing
-- Date: 2025-08-18

-- Add sender_email column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_processing_logs' AND column_name='sender_email') THEN
        ALTER TABLE email_processing_logs ADD COLUMN sender_email VARCHAR(255);
    END IF;
END $$;

-- Add index for sender email lookups
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_sender_email ON email_processing_logs(sender_email);

-- Add comment
COMMENT ON COLUMN email_processing_logs.sender_email IS 'Email address of the sender (extracted from webhook or email headers)';
```

#### Migration 7: `0062_shadow_publisher_system_completion.sql`
```sql
-- Shadow Publisher System Completion Migration
-- Date: 2025-08-23
-- Purpose: Complete the shadow publisher migration system by adding missing database columns and tables

-- PART 1: Add missing columns to publishers table
-- These columns are required for tracking shadow publisher migration status

ALTER TABLE publishers 
ADD COLUMN shadow_data_migrated BOOLEAN DEFAULT false,
ADD COLUMN shadow_migration_completed_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN publishers.shadow_data_migrated IS 'Tracks whether shadow publisher data has been successfully migrated to active publisher records';
COMMENT ON COLUMN publishers.shadow_migration_completed_at IS 'Timestamp when shadow publisher migration was completed';

-- PART 2: Update shadow_publisher_websites table structure
-- Add missing columns that the migration service expects

ALTER TABLE shadow_publisher_websites 
ADD COLUMN migration_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN migrated_at TIMESTAMP,
ADD COLUMN migration_notes TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Add comments
COMMENT ON COLUMN shadow_publisher_websites.migration_status IS 'Status of shadow data migration: pending, migrating, migrated, failed, skipped';
COMMENT ON COLUMN shadow_publisher_websites.migrated_at IS 'Timestamp when shadow data was successfully migrated';
COMMENT ON COLUMN shadow_publisher_websites.migration_notes IS 'Notes about migration process, errors, or special handling';

-- Add index for migration status queries
CREATE INDEX idx_shadow_publisher_websites_migration_status ON shadow_publisher_websites(migration_status);
CREATE INDEX idx_shadow_publisher_websites_publisher_migration ON shadow_publisher_websites(publisher_id, migration_status);

-- PART 3: Create publisher_claim_history table
-- This table tracks all claim attempts for security and audit purposes

CREATE TABLE IF NOT EXISTS publisher_claim_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'initiate_claim', 'complete_claim', 'fail_claim', etc.
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address VARCHAR(45), -- Support IPv4 and IPv6
    user_agent TEXT,
    verification_method VARCHAR(100), -- 'token', 'email_domain', 'manual', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_publisher_claim_history_publisher_id ON publisher_claim_history(publisher_id);
CREATE INDEX idx_publisher_claim_history_action ON publisher_claim_history(action);
CREATE INDEX idx_publisher_claim_history_success ON publisher_claim_history(success);
CREATE INDEX idx_publisher_claim_history_created_at ON publisher_claim_history(created_at);

-- Add comments
COMMENT ON TABLE publisher_claim_history IS 'Audit log of all publisher account claim attempts and activities';
COMMENT ON COLUMN publisher_claim_history.action IS 'The specific action taken: initiate_claim, complete_claim, fail_claim, etc.';
COMMENT ON COLUMN publisher_claim_history.success IS 'Whether the action completed successfully';
COMMENT ON COLUMN publisher_claim_history.failure_reason IS 'Details about why an action failed';
COMMENT ON COLUMN publisher_claim_history.verification_method IS 'How the publisher was verified during this action';
COMMENT ON COLUMN publisher_claim_history.metadata IS 'Additional context and data about the claim attempt';

-- PART 4: Add database constraints and validations
-- Ensure data integrity for the shadow publisher system

-- Migration status constraint
ALTER TABLE shadow_publisher_websites 
ADD CONSTRAINT check_migration_status 
CHECK (migration_status IN ('pending', 'migrating', 'migrated', 'failed', 'skipped'));

-- Publisher account status constraint (ensure shadow status is valid)
ALTER TABLE publishers 
ADD CONSTRAINT check_account_status 
CHECK (account_status IN ('unclaimed', 'active', 'inactive', 'shadow', 'suspended'));

-- PART 5: Data cleanup and consistency
-- Update any existing shadow publishers to have consistent data

-- Set shadow_data_migrated to false for existing shadow publishers
UPDATE publishers 
SET shadow_data_migrated = false 
WHERE account_status = 'shadow' AND shadow_data_migrated IS NULL;

-- Update any existing shadow_publisher_websites records to have migration_status = 'pending'
UPDATE shadow_publisher_websites 
SET migration_status = 'pending', updated_at = NOW()
WHERE migration_status IS NULL;

-- PART 6: Create helpful views for monitoring
-- Create a view for monitoring shadow publisher migration progress

CREATE OR REPLACE VIEW shadow_migration_progress AS
SELECT 
    p.id,
    p.email,
    p.contact_name,
    p.company_name,
    p.account_status,
    p.shadow_data_migrated,
    p.shadow_migration_completed_at,
    p.invitation_token IS NOT NULL as has_invitation_token,
    p.invitation_expires_at,
    COUNT(spw.id) as total_shadow_websites,
    COUNT(CASE WHEN spw.migration_status = 'migrated' THEN 1 END) as migrated_websites,
    COUNT(CASE WHEN spw.migration_status = 'failed' THEN 1 END) as failed_websites,
    COUNT(CASE WHEN spw.migration_status = 'pending' THEN 1 END) as pending_websites
FROM publishers p
LEFT JOIN shadow_publisher_websites spw ON p.id = spw.publisher_id
WHERE p.account_status = 'shadow'
GROUP BY p.id, p.email, p.contact_name, p.company_name, p.account_status, 
         p.shadow_data_migrated, p.shadow_migration_completed_at, 
         p.invitation_token, p.invitation_expires_at;

COMMENT ON VIEW shadow_migration_progress IS 'Monitoring view for shadow publisher migration status and progress';
```

#### Migration 8: `0063_email_qualification_tracking.sql`
```sql
-- Migration: Add email qualification tracking and source email references
-- This enables the V2 email parser to qualify emails before creating publishers
-- and track the source of pricing information for audit trails

-- Enhance email_processing_logs for qualification tracking
ALTER TABLE email_processing_logs 
ADD COLUMN qualification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN disqualification_reason VARCHAR(100);

-- Add index for qualification queries
CREATE INDEX idx_email_logs_qualification_status ON email_processing_logs(qualification_status);

-- Enhance publisher_offerings for source email tracking  
ALTER TABLE publisher_offerings 
ADD COLUMN source_email_id UUID REFERENCES email_processing_logs(id),
ADD COLUMN source_email_content TEXT,
ADD COLUMN pricing_extracted_from TEXT;

-- Add index for source email lookups
CREATE INDEX idx_publisher_offerings_source_email ON publisher_offerings(source_email_id);

-- Update existing parsed emails to have qualification status
-- (They were created before qualification logic, so mark as processed)
UPDATE email_processing_logs 
SET qualification_status = 'legacy_processed' 
WHERE status = 'parsed';

-- Add comments for documentation
COMMENT ON COLUMN email_processing_logs.qualification_status IS 'Status: pending, qualified, disqualified, legacy_processed';
COMMENT ON COLUMN email_processing_logs.disqualification_reason IS 'Reason: link_swap, no_pricing, rejection, vague_response, etc.';
COMMENT ON COLUMN publisher_offerings.source_email_id IS 'Reference to the email that provided the pricing information';
COMMENT ON COLUMN publisher_offerings.source_email_content IS 'Copy of the email content for audit trail';
COMMENT ON COLUMN publisher_offerings.pricing_extracted_from IS 'Specific quote/text that contained the pricing information';
```

### Phase 3: Additional System Enhancements

#### Migration 9: `0060_add_target_url_matching.sql` (Optional)
```sql
-- Migration: Add target URL matching system
-- Purpose: AI-powered domain to target URL matching
-- Date: 2025-08-19

ALTER TABLE websites 
ADD COLUMN suggested_target_url TEXT,
ADD COLUMN target_match_data JSONB DEFAULT '{}',
ADD COLUMN target_matched_at TIMESTAMP;

-- Add indexes for target URL matching
CREATE INDEX idx_websites_suggested_target_url ON websites(suggested_target_url);
CREATE INDEX idx_websites_target_matched_at ON websites(target_matched_at);

-- Add comments
COMMENT ON COLUMN websites.suggested_target_url IS 'AI-suggested target URL for guest post placement';
COMMENT ON COLUMN websites.target_match_data IS 'Evidence and scoring data for target URL matching';
COMMENT ON COLUMN websites.target_matched_at IS 'Timestamp when target URL was matched';
```

#### Migration 10: `0061_fix_inclusion_status_defaults.sql` (Optional)
```sql
-- Migration: Fix inclusion status defaults
-- Purpose: Ensure proper default values for order line items
-- Date: 2025-08-20

-- Update existing NULL inclusion_status to 'included'
UPDATE order_line_items 
SET inclusion_status = 'included' 
WHERE inclusion_status IS NULL;

-- Set default for future inserts
ALTER TABLE order_line_items 
ALTER COLUMN inclusion_status SET DEFAULT 'included';

-- Add comment
COMMENT ON COLUMN order_line_items.inclusion_status IS 'Status: included, excluded, pending - defaults to included for better UX';
```

#### Migration 11: `0062_fix_website_source_constraint.sql` (Optional)
```sql
-- Migration: Fix website source field constraints
-- Purpose: Fix source field constraints in websites table
-- Date: 2025-08-18

-- Remove old constraint if it exists
ALTER TABLE websites DROP CONSTRAINT IF EXISTS chk_websites_source;

-- Add new constraint with more values
ALTER TABLE websites 
ADD CONSTRAINT chk_websites_source 
CHECK (source IN ('manual', 'airtable', 'import', 'api', 'email_extraction', 'test'));

-- Add comment
COMMENT ON COLUMN websites.source IS 'Source of website data: manual, airtable, import, api, email_extraction, test';
```

## Post-Migration Verification

### 1. Verify Critical Tables Exist
```sql
-- Check that all new tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
    'email_processing_logs',
    'email_review_queue', 
    'email_follow_ups',
    'publisher_automation_logs',
    'webhook_security_logs',
    'shadow_publisher_websites',
    'publisher_claim_history'
);
```

### 2. Verify Publishers Table Columns
```sql
-- Check publishers table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'publishers' 
AND column_name IN (
    'account_status',
    'source',
    'source_metadata',
    'claimed_at',
    'invitation_token',
    'invitation_sent_at',
    'invitation_expires_at',
    'confidence_score',
    'claim_verification_code',
    'claim_attempts',
    'last_claim_attempt',
    'shadow_data_migrated',
    'shadow_migration_completed_at'
);
```

### 3. Verify Indexes Were Created
```sql
-- Check that performance indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('publishers', 'shadow_publisher_websites', 'email_processing_logs')
AND indexname LIKE 'idx_%';
```

### 4. Test Basic Functionality
```sql
-- Test shadow publisher creation (should work without errors)
INSERT INTO publishers (
    id, email, contact_name, company_name, 
    account_status, source, confidence_score
) VALUES (
    gen_random_uuid(), 
    'test@example.com', 
    'Test Publisher', 
    'Test Company',
    'shadow',
    'email_extraction',
    0.85
);

-- Clean up test data
DELETE FROM publishers WHERE email = 'test@example.com' AND account_status = 'shadow';
```

## Rollback Instructions (If Needed)

If you need to rollback these migrations:

```sql
-- WARNING: This will destroy data. Only use if necessary.

-- Drop new tables (in reverse order)
DROP TABLE IF EXISTS publisher_claim_history CASCADE;
DROP TABLE IF EXISTS shadow_publisher_websites CASCADE;
DROP TABLE IF EXISTS webhook_security_logs CASCADE;
DROP TABLE IF EXISTS publisher_automation_logs CASCADE;
DROP TABLE IF EXISTS email_follow_ups CASCADE;
DROP TABLE IF EXISTS email_review_queue CASCADE;
DROP TABLE IF EXISTS email_processing_logs CASCADE;

-- Remove columns from publishers table
ALTER TABLE publishers 
DROP COLUMN IF EXISTS shadow_migration_completed_at,
DROP COLUMN IF EXISTS shadow_data_migrated,
DROP COLUMN IF EXISTS last_claim_attempt,
DROP COLUMN IF EXISTS claim_attempts,
DROP COLUMN IF EXISTS claim_verification_code,
DROP COLUMN IF EXISTS confidence_score,
DROP COLUMN IF EXISTS invitation_expires_at,
DROP COLUMN IF EXISTS invitation_sent_at,
DROP COLUMN IF EXISTS invitation_token,
DROP COLUMN IF EXISTS claimed_at,
DROP COLUMN IF EXISTS source_metadata,
DROP COLUMN IF EXISTS source,
DROP COLUMN IF EXISTS account_status;

-- Restore password NOT NULL constraint
ALTER TABLE publishers ALTER COLUMN password SET NOT NULL;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS publisher_status_change_trigger ON publishers;
DROP FUNCTION IF EXISTS log_publisher_status_change();
DROP TRIGGER IF EXISTS shadow_publisher_websites_update_timestamp ON shadow_publisher_websites;
DROP FUNCTION IF EXISTS update_shadow_publisher_websites_timestamp();
```

## Migration Execution Checklist

- [ ] **Database backup completed**
- [ ] **Production traffic stopped or reduced** 
- [ ] **Migration 1 completed successfully**
- [ ] **Migration 2 completed successfully** 
- [ ] **Migration 3 completed successfully**
- [ ] **Migration 4 completed successfully**
- [ ] **Migration 5 completed successfully**
- [ ] **Migration 6 completed successfully**
- [ ] **Migration 7 completed successfully**
- [ ] **Migration 8 completed successfully**
- [ ] **Post-migration verification passed**
- [ ] **Application deployment completed**
- [ ] **Shadow publisher system tested**
- [ ] **Production traffic restored**

---

**⚠️ CRITICAL REMINDERS:**
1. **BACKUP FIRST** - Create a full database backup before starting
2. **TEST IN STAGING** - Run these exact commands in staging first
3. **MONITOR CLOSELY** - Watch for errors and stop if any migration fails
4. **COORDINATE DEPLOYMENT** - Ensure application code is deployed after database migrations
5. **VERIFY FUNCTIONALITY** - Test critical features after migration completion

**Time Estimate:** 2-3 hours total (including verification)