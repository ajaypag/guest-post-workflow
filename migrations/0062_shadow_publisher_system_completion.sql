-- Shadow Publisher System Completion Migration
-- Date: 2025-08-23
-- Purpose: Complete the shadow publisher migration system by adding missing database columns and tables
-- 
-- This migration fixes schema mismatches identified during E2E testing that prevent the shadow publisher
-- claim flow from functioning properly.

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

-- PART 7: Grant necessary permissions
-- Ensure the application can access the new tables and columns

-- Note: Adjust these grants based on your application database user
-- GRANT SELECT, INSERT, UPDATE ON publisher_claim_history TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON shadow_publisher_websites TO your_app_user;
-- GRANT SELECT, UPDATE ON publishers TO your_app_user;

-- Migration completed successfully
-- This completes the shadow publisher system database schema