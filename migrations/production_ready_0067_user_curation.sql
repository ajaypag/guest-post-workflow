-- ============================================================================
-- PRODUCTION-READY MIGRATION: User Curation for Bulk Analysis
-- Migration 0067 - The only migration needed for production
-- Date: 2025-08-23
-- 
-- This adds bookmark/hide functionality to the vetted sites feature
-- ============================================================================

-- Check if migration already applied
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0067_add_user_curation_to_bulk_analysis') THEN
        RAISE NOTICE 'Applying Migration 0067: User Curation for Bulk Analysis...';
        
        -- Add user curation columns to bulk_analysis_domains table
        ALTER TABLE bulk_analysis_domains 
        ADD COLUMN IF NOT EXISTS user_bookmarked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS user_hidden BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS user_bookmarked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS user_hidden_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS user_bookmarked_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS user_hidden_by UUID REFERENCES users(id);

        -- Create performance indexes
        -- Index for finding bookmarked domains (sparse index for performance)
        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_bookmarked 
        ON bulk_analysis_domains(user_bookmarked) 
        WHERE user_bookmarked = true;

        -- Index for finding hidden domains (sparse index for performance)
        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_hidden 
        ON bulk_analysis_domains(user_hidden) 
        WHERE user_hidden = true;

        -- Composite index for user-specific filtering (most common query pattern)
        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_actions 
        ON bulk_analysis_domains(user_bookmarked_by, user_bookmarked, user_hidden);

        -- Index for user activity queries (who did what when)
        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_activity
        ON bulk_analysis_domains(user_bookmarked_at, user_hidden_at)
        WHERE user_bookmarked_at IS NOT NULL OR user_hidden_at IS NOT NULL;

        -- Add documentation comments
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked IS 'User has marked this domain as a favorite/bookmark for easy finding';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden IS 'User has hidden this domain from their default view to reduce clutter';
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_by IS 'User ID who bookmarked this domain';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden_by IS 'User ID who hid this domain';
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_at IS 'Timestamp when domain was bookmarked';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden_at IS 'Timestamp when domain was hidden';

        -- Record migration as complete
        INSERT INTO migrations (name, applied_at) 
        VALUES ('0067_add_user_curation_to_bulk_analysis', NOW());
        
        RAISE NOTICE 'Migration 0067 completed successfully!';
    ELSE
        RAISE NOTICE 'Migration 0067 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm success
-- ============================================================================

-- Check that columns were added
SELECT 
    'User Curation Columns Added:' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bulk_analysis_domains' 
  AND column_name IN (
    'user_bookmarked', 'user_hidden', 
    'user_bookmarked_at', 'user_hidden_at',
    'user_bookmarked_by', 'user_hidden_by'
  );

-- Check that indexes were created
SELECT 
    'User Curation Indexes Created:' as status,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename = 'bulk_analysis_domains' 
  AND indexname IN (
    'idx_bulk_analysis_user_bookmarked',
    'idx_bulk_analysis_user_hidden',
    'idx_bulk_analysis_user_actions',
    'idx_bulk_analysis_user_activity'
  );

-- Check default values are working
SELECT 
    'Domains with default values:' as status,
    COUNT(*) as total_domains,
    SUM(CASE WHEN user_bookmarked = false THEN 1 ELSE 0 END) as unbookmarked,
    SUM(CASE WHEN user_hidden = false THEN 1 ELSE 0 END) as unhidden
FROM bulk_analysis_domains
LIMIT 1;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

/*
-- TO ROLLBACK THIS MIGRATION:

-- Remove indexes first
DROP INDEX IF EXISTS idx_bulk_analysis_user_bookmarked;
DROP INDEX IF EXISTS idx_bulk_analysis_user_hidden;
DROP INDEX IF EXISTS idx_bulk_analysis_user_actions;
DROP INDEX IF EXISTS idx_bulk_analysis_user_activity;

-- Remove columns
ALTER TABLE bulk_analysis_domains 
DROP COLUMN IF EXISTS user_bookmarked,
DROP COLUMN IF EXISTS user_hidden,
DROP COLUMN IF EXISTS user_bookmarked_at,
DROP COLUMN IF EXISTS user_hidden_at,
DROP COLUMN IF EXISTS user_bookmarked_by,
DROP COLUMN IF EXISTS user_hidden_by;

-- Remove migration record
DELETE FROM migrations WHERE name = '0067_add_user_curation_to_bulk_analysis';
*/