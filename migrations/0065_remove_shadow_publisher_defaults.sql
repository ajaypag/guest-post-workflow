-- Migration: Remove Default Values from Shadow Publisher Offerings
-- Description: Removes hardcoded defaults (14 days turnaround, 500-2000 word counts) from shadow publisher offerings
-- Author: System
-- Date: 2025-01-23
-- 
-- Context: Shadow publisher migration incorrectly set all offerings to have:
-- - 14 days turnaround (should be publisher-specific)
-- - 500 min word count (should be publisher-specific)
-- - 2000 max word count (should be publisher-specific)
-- This migration removes these defaults so publishers can set their own values

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Remove default turnaround days (14) from shadow publisher offerings
-- ============================================================================

UPDATE publisher_offerings po
SET 
  turnaround_days = NULL,
  updated_at = NOW()
FROM publishers p
WHERE 
  po.publisher_id = p.id
  AND p.is_shadow = true
  AND po.turnaround_days = 14
  AND po.created_at::date = po.updated_at::date; -- Only if never manually edited

-- Log the change
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removed default turnaround (14 days) from % shadow publisher offerings', affected_count;
END $$;

-- ============================================================================
-- STEP 2: Remove default word counts (500-2000) from shadow publisher offerings
-- ============================================================================

UPDATE publisher_offerings po
SET 
  min_word_count = NULL,
  max_word_count = NULL,
  updated_at = NOW()
FROM publishers p
WHERE 
  po.publisher_id = p.id
  AND p.is_shadow = true
  AND po.min_word_count = 500
  AND po.max_word_count = 2000
  AND po.created_at::date = po.updated_at::date; -- Only if never manually edited

-- Log the change
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removed default word counts (500-2000) from % shadow publisher offerings', affected_count;
END $$;

-- ============================================================================
-- STEP 3: For offerings that have been edited, just remove obvious migration defaults
-- ============================================================================

-- Remove turnaround if it's exactly 14 and offering was created during migration
UPDATE publisher_offerings po
SET 
  turnaround_days = NULL,
  updated_at = NOW()
FROM publishers p
WHERE 
  po.publisher_id = p.id
  AND p.is_shadow = true
  AND po.turnaround_days = 14
  AND po.created_at::date = '2025-01-23'::date; -- Migration date

-- Remove word counts if they're exactly 500-2000 and offering was created during migration
UPDATE publisher_offerings po
SET 
  min_word_count = CASE WHEN po.min_word_count = 500 THEN NULL ELSE po.min_word_count END,
  max_word_count = CASE WHEN po.max_word_count = 2000 THEN NULL ELSE po.max_word_count END,
  updated_at = NOW()
FROM publishers p
WHERE 
  po.publisher_id = p.id
  AND p.is_shadow = true
  AND (po.min_word_count = 500 OR po.max_word_count = 2000)
  AND po.created_at::date = '2025-01-23'::date; -- Migration date

-- ============================================================================
-- STEP 4: Show summary of changes
-- ============================================================================

-- Show summary of offerings after cleanup
SELECT 
  'Shadow Publisher Offerings Summary' as description,
  COUNT(*) as total_offerings,
  COUNT(turnaround_days) as with_turnaround,
  COUNT(min_word_count) as with_min_words,
  COUNT(max_word_count) as with_max_words,
  COUNT(CASE WHEN turnaround_days IS NULL THEN 1 END) as null_turnaround,
  COUNT(CASE WHEN min_word_count IS NULL THEN 1 END) as null_min_words,
  COUNT(CASE WHEN max_word_count IS NULL THEN 1 END) as null_max_words
FROM publisher_offerings po
JOIN publishers p ON po.publisher_id = p.id
WHERE p.is_shadow = true;

-- Show distinct values that remain
SELECT 
  'Remaining Turnaround Values' as field,
  turnaround_days as value,
  COUNT(*) as count
FROM publisher_offerings po
JOIN publishers p ON po.publisher_id = p.id
WHERE p.is_shadow = true
  AND turnaround_days IS NOT NULL
GROUP BY turnaround_days
ORDER BY count DESC;

SELECT 
  'Remaining Word Count Ranges' as field,
  CONCAT(min_word_count, '-', max_word_count) as range,
  COUNT(*) as count
FROM publisher_offerings po
JOIN publishers p ON po.publisher_id = p.id
WHERE p.is_shadow = true
  AND (min_word_count IS NOT NULL OR max_word_count IS NOT NULL)
GROUP BY min_word_count, max_word_count
ORDER BY count DESC;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Save separately)
-- ============================================================================
/*
-- To rollback this migration, you would need to restore the defaults
-- But this is not recommended as these were incorrect defaults

BEGIN TRANSACTION;

UPDATE publisher_offerings po
SET 
  turnaround_days = COALESCE(turnaround_days, 14),
  min_word_count = COALESCE(min_word_count, 500),
  max_word_count = COALESCE(max_word_count, 2000),
  updated_at = NOW()
FROM publishers p
WHERE 
  po.publisher_id = p.id
  AND p.is_shadow = true;

COMMIT;
*/