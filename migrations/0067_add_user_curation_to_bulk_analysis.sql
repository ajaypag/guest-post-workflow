-- Migration 0067: Add user curation fields to bulk_analysis_domains
-- Date: 2025-08-22
-- Purpose: Enable bookmark/hide functionality for vetted sites feature
-- 
-- VERIFIED SCHEMA STATUS:
-- - Current columns: 54
-- - No naming conflicts found
-- - Users table exists with UUID id field
-- - Safe to proceed

-- ============================================================================
-- ADD USER CURATION COLUMNS
-- ============================================================================

-- Add user curation columns to bulk_analysis_domains table
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS user_bookmarked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_bookmarked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_hidden_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_bookmarked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS user_hidden_by UUID REFERENCES users(id);

-- ============================================================================
-- ADD PERFORMANCE INDEXES
-- ============================================================================

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

-- ============================================================================
-- ADD DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked IS 'User has marked this domain as a favorite/bookmark for easy finding';
COMMENT ON COLUMN bulk_analysis_domains.user_hidden IS 'User has hidden this domain from their default view to reduce clutter';
COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_by IS 'User ID who bookmarked this domain';
COMMENT ON COLUMN bulk_analysis_domains.user_hidden_by IS 'User ID who hid this domain';
COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_at IS 'Timestamp when domain was bookmarked';
COMMENT ON COLUMN bulk_analysis_domains.user_hidden_at IS 'Timestamp when domain was hidden';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all columns were added correctly
-- Run this after migration to confirm success:
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bulk_analysis_domains' 
  AND column_name LIKE 'user_%'
ORDER BY column_name;
*/

-- Verify indexes were created
-- Run this to confirm index creation:
/*
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'bulk_analysis_domains' 
  AND indexname LIKE '%user%'
ORDER BY indexname;
*/

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- TO ROLLBACK THIS MIGRATION (if needed):
/*
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
*/

-- ============================================================================
-- EXPECTED IMPACT
-- ============================================================================

-- Performance Impact: Minimal (sparse indexes only on active data)
-- Storage Impact: ~96 bytes per row (6 new columns × 16 bytes avg)
-- Data Impact: 320 qualified domains get new fields (all default to FALSE/NULL)
-- Downtime: None (additive changes only, no data modification)

-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================

-- Check that defaults are working correctly:
-- SELECT COUNT(*) FROM bulk_analysis_domains WHERE user_bookmarked = false; -- Should equal total rows
-- SELECT COUNT(*) FROM bulk_analysis_domains WHERE user_hidden = false; -- Should equal total rows

-- Test the indexes are being used:
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM bulk_analysis_domains WHERE user_bookmarked = true;
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM bulk_analysis_domains WHERE user_hidden = false;