-- Add migration tracking columns to shadow publisher tables
-- This enables soft delete pattern with audit trail for shadow -> active publisher migrations

-- Add migration tracking to shadow_publisher_websites
ALTER TABLE shadow_publisher_websites ADD COLUMN IF NOT EXISTS 
    migration_status VARCHAR(20) DEFAULT 'pending' CHECK (migration_status IN ('pending', 'migrating', 'migrated', 'failed', 'skipped'));
    
ALTER TABLE shadow_publisher_websites ADD COLUMN IF NOT EXISTS
    migrated_at TIMESTAMP WITH TIME ZONE;
    
ALTER TABLE shadow_publisher_websites ADD COLUMN IF NOT EXISTS
    migration_notes TEXT;

-- Add source tracking to publisher_websites (to trace back to shadow origin)
ALTER TABLE publisher_websites ADD COLUMN IF NOT EXISTS
    source VARCHAR(50) DEFAULT 'direct' CHECK (source IN ('direct', 'shadow_migration', 'manual', 'import'));
    
ALTER TABLE publisher_websites ADD COLUMN IF NOT EXISTS
    shadow_source_id VARCHAR(36);

-- Add migration tracking to publishers table for the account itself
ALTER TABLE publishers ADD COLUMN IF NOT EXISTS
    shadow_data_migrated BOOLEAN DEFAULT false;
    
ALTER TABLE publishers ADD COLUMN IF NOT EXISTS
    shadow_migration_completed_at TIMESTAMP WITH TIME ZONE;

-- Add migration tracking to publisher_offerings
ALTER TABLE publisher_offerings ADD COLUMN IF NOT EXISTS
    source VARCHAR(50) DEFAULT 'direct' CHECK (source IN ('direct', 'shadow_migration', 'manual', 'email_extraction'));
    
ALTER TABLE publisher_offerings ADD COLUMN IF NOT EXISTS
    shadow_source_metadata JSONB;

-- Create index for efficient queries on migration status
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_migration_status 
    ON shadow_publisher_websites(migration_status) 
    WHERE migration_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_migrated 
    ON shadow_publisher_websites(publisher_id, migration_status);

CREATE INDEX IF NOT EXISTS idx_publisher_websites_shadow_source 
    ON publisher_websites(shadow_source_id) 
    WHERE shadow_source_id IS NOT NULL;

-- Create archive table for old shadow data (for quarterly cleanup)
CREATE TABLE IF NOT EXISTS shadow_publisher_websites_archive (
    id VARCHAR(36) PRIMARY KEY,
    publisher_id VARCHAR(36),
    website_id VARCHAR(36),
    confidence VARCHAR(10),
    source VARCHAR(50),
    extraction_method VARCHAR(50),
    verified BOOLEAN,
    migration_status VARCHAR(20),
    migrated_at TIMESTAMP WITH TIME ZONE,
    migration_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment explaining the migration workflow
COMMENT ON COLUMN shadow_publisher_websites.migration_status IS 
    'Tracks shadow data migration: pending (not migrated), migrating (in progress), migrated (successfully moved), failed (error during migration), skipped (duplicate or invalid)';

COMMENT ON COLUMN publisher_websites.shadow_source_id IS 
    'References the original shadow_publisher_websites record this was migrated from for audit trail';

COMMENT ON COLUMN publishers.shadow_data_migrated IS 
    'Flag indicating if shadow publisher data (websites, offerings) has been migrated to active tables';