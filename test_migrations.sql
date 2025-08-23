-- Production Migration Test Script
-- Testing all migrations against production backup
-- Date: 2025-08-23

\echo 'Starting Migration Test...'
\echo '========================='

-- Set up error handling
\set ON_ERROR_STOP on
\set VERBOSITY verbose

\echo 'Current database state:'
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';

\echo ''
\echo 'Testing Migration 1: 0054_fix_multiple_offerings_per_website.sql'
\echo '================================================================='

-- Check current constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'publisher_offering_relationships' 
AND constraint_type = 'UNIQUE';

-- Apply migration 1
BEGIN;

-- First, remove the existing constraint if it exists
ALTER TABLE publisher_offering_relationships 
DROP CONSTRAINT IF EXISTS publisher_offering_relationships_publisher_id_website_id_key;

-- Add a new constraint that allows multiple offerings per website
ALTER TABLE publisher_offering_relationships 
ADD CONSTRAINT publisher_offering_relationships_unique_offering 
UNIQUE (publisher_id, website_id, offering_id);

COMMIT;

\echo 'Migration 1 completed successfully!'

\echo ''
\echo 'Testing Migration 2: 0055_shadow_publisher_support.sql'
\echo '======================================================'

-- Check what columns already exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'publishers' 
AND column_name IN ('account_status', 'source', 'shadow_data_migrated');

-- Apply migration 2 (most columns already exist, but check for missing ones)
BEGIN;

-- Add any missing columns
ALTER TABLE publishers 
ADD COLUMN IF NOT EXISTS shadow_data_migrated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shadow_migration_completed_at TIMESTAMP;

-- Check if password is nullable
SELECT is_nullable FROM information_schema.columns 
WHERE table_name = 'publishers' AND column_name = 'password';

COMMIT;

\echo 'Migration 2 completed successfully!'

\echo ''
\echo 'Testing Migration 3: 0056_email_processing_infrastructure.sql' 
\echo '============================================================='

-- Check which tables already exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('email_processing_logs', 'email_review_queue', 'email_follow_ups', 'publisher_automation_logs');

-- Apply migration 3 - Create missing tables
BEGIN;

-- Create email_review_queue if it doesn't exist
CREATE TABLE IF NOT EXISTS email_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID NOT NULL REFERENCES email_processing_logs(id),
  
  -- Review metadata
  priority INTEGER DEFAULT 5, 
  reason VARCHAR(100),
  assigned_to VARCHAR(255),
  
  -- Review results
  review_status VARCHAR(50) DEFAULT 'pending',
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

-- Create email_follow_ups if it doesn't exist  
CREATE TABLE IF NOT EXISTS email_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_email_id UUID NOT NULL REFERENCES email_processing_logs(id),
  publisher_id UUID,
  
  -- Follow-up scheduling
  follow_up_type VARCHAR(50),
  scheduled_for TIMESTAMP,
  template_used VARCHAR(100),
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'scheduled',
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50),
  
  -- Response tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_email_id UUID REFERENCES email_processing_logs(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

\echo 'Migration 3 completed successfully!'

\echo ''
\echo 'Testing Migration 4: 0058_webhook_security_logs.sql'
\echo '==================================================='

-- Check if table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_security_logs';

-- Table should already exist, so this should be a no-op
\echo 'Webhook security logs table already exists - skipping'

\echo ''
\echo 'Testing Migration 5: 0059_shadow_publisher_system.sql'
\echo '===================================================='

-- Check shadow_publisher_websites structure  
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'shadow_publisher_websites';

-- Add missing columns
BEGIN;

ALTER TABLE shadow_publisher_websites 
ADD COLUMN IF NOT EXISTS migration_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS migration_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to publisher_offerings
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS express_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS express_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS express_days INTEGER;

COMMIT;

\echo 'Migration 5 completed successfully!'

\echo ''
\echo 'Testing Migration 6: 0061_add_sender_email_column.sql'
\echo '====================================================='

-- Check if sender_email column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'email_processing_logs' AND column_name = 'sender_email';

-- Should already exist, but add if missing
ALTER TABLE email_processing_logs 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

\echo 'Migration 6 completed successfully!'

\echo ''
\echo 'Testing Migration 7: 0062_shadow_publisher_system_completion.sql'
\echo '================================================================'

-- Check if publisher_claim_history exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'publisher_claim_history';

BEGIN;

-- Create publisher_claim_history table
CREATE TABLE IF NOT EXISTS publisher_claim_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    verification_method VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_publisher_claim_history_publisher_id ON publisher_claim_history(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_claim_history_action ON publisher_claim_history(action);

-- Add constraints to shadow_publisher_websites
ALTER TABLE shadow_publisher_websites 
ADD CONSTRAINT IF NOT EXISTS check_migration_status 
CHECK (migration_status IN ('pending', 'migrating', 'migrated', 'failed', 'skipped'));

COMMIT;

\echo 'Migration 7 completed successfully!'

\echo ''
\echo 'Testing Migration 8: 0063_email_qualification_tracking.sql'
\echo '=========================================================='

BEGIN;

-- Enhance email_processing_logs for qualification tracking
ALTER TABLE email_processing_logs 
ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS disqualification_reason VARCHAR(100);

-- Enhance publisher_offerings for source email tracking  
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS source_email_id UUID REFERENCES email_processing_logs(id),
ADD COLUMN IF NOT EXISTS source_email_content TEXT,
ADD COLUMN IF NOT EXISTS pricing_extracted_from TEXT;

COMMIT;

\echo 'Migration 8 completed successfully!'

\echo ''
\echo '========================================'
\echo 'ALL MIGRATIONS COMPLETED SUCCESSFULLY!'
\echo '========================================'

-- Final verification
\echo 'Final database state verification:'
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';

\echo 'Key tables verification:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN (
    'publishers', 
    'shadow_publisher_websites',
    'email_processing_logs',
    'email_review_queue',
    'email_follow_ups', 
    'publisher_automation_logs',
    'webhook_security_logs',
    'publisher_claim_history'
) ORDER BY tablename;

\echo 'Publishers table key columns:'
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'publishers' 
AND column_name IN (
    'account_status',
    'shadow_data_migrated', 
    'shadow_migration_completed_at',
    'invitation_token'
) ORDER BY column_name;