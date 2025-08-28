-- ROLLBACK for 0076_add_target_page_hash.sql
-- Use this to undo the migration if issues are encountered

-- Drop the index first
DROP INDEX IF EXISTS idx_bulk_domains_target_hash;

-- Drop the column
ALTER TABLE bulk_analysis_domains 
DROP COLUMN IF EXISTS target_page_hash;