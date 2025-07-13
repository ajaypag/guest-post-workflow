-- ROLLBACK: Remove keywords field from target_pages table
-- Created: 2025-01-12
-- Description: Removes the keywords column if you want to rollback the keyword automation

ALTER TABLE target_pages DROP COLUMN IF EXISTS keywords;