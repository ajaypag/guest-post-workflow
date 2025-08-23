-- Investigation: Find and remove default values from publisher offerings
-- Date: 2025-01-23

-- First, let's understand the data
SELECT 'Shadow Publishers Analysis' as analysis;

-- 1. How many shadow publishers exist?
SELECT 
  COUNT(*) as total_publishers,
  SUM(CASE WHEN password IS NULL THEN 1 ELSE 0 END) as shadow_publishers,
  SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END) as regular_publishers
FROM publishers;

-- 2. What offerings exist and what are their values?
SELECT 'Offerings with Default Values' as analysis;
SELECT 
  CASE WHEN p.password IS NULL THEN 'shadow' ELSE 'regular' END as publisher_type,
  COUNT(*) as total_offerings,
  SUM(CASE WHEN po.turnaround_days = 14 THEN 1 ELSE 0 END) as has_14_days,
  SUM(CASE WHEN po.min_word_count = 500 THEN 1 ELSE 0 END) as has_500_min,
  SUM(CASE WHEN po.max_word_count = 2000 THEN 1 ELSE 0 END) as has_2000_max,
  SUM(CASE WHEN po.turnaround_days = 14 AND po.min_word_count = 500 AND po.max_word_count = 2000 THEN 1 ELSE 0 END) as has_all_defaults
FROM publisher_offerings po
JOIN publishers p ON po.publisher_id = p.id
GROUP BY CASE WHEN p.password IS NULL THEN 'shadow' ELSE 'regular' END;

-- 3. Sample of offerings with defaults
SELECT 'Sample Offerings with Defaults' as analysis;
SELECT 
  p.id,
  p.email,
  p.company_name,
  CASE WHEN p.password IS NULL THEN 'shadow' ELSE 'regular' END as type,
  po.turnaround_days,
  po.min_word_count,
  po.max_word_count,
  po.created_at,
  po.updated_at,
  po.created_at = po.updated_at as never_edited
FROM publisher_offerings po
JOIN publishers p ON po.publisher_id = p.id
WHERE po.turnaround_days = 14 
   OR po.min_word_count = 500 
   OR po.max_word_count = 2000
ORDER BY po.created_at DESC
LIMIT 20;

-- 4. Check if there's a better way to identify shadow publishers
SELECT 'Publisher Identification Methods' as analysis;
SELECT 
  COUNT(*) as count,
  'password IS NULL' as method
FROM publishers WHERE password IS NULL
UNION ALL
SELECT 
  COUNT(*) as count,
  'email = company_name' as method
FROM publishers WHERE email = company_name
UNION ALL
SELECT 
  COUNT(*) as count,
  'company_name LIKE email without domain' as method
FROM publishers WHERE company_name = SPLIT_PART(email, '@', 1)
UNION ALL
SELECT 
  COUNT(*) as count,
  'created via migration (check date)' as method
FROM publishers WHERE created_at >= '2025-01-23'::date AND created_at < '2025-01-24'::date;

-- Now let's do the actual migration with less restrictive conditions
BEGIN TRANSACTION;

-- Remove defaults regardless of publisher type or edit status
-- We'll be conservative and only remove the exact default values

-- Step 1: Remove 14-day turnaround default
UPDATE publisher_offerings
SET 
  turnaround_days = NULL,
  updated_at = NOW()
WHERE turnaround_days = 14
  AND offering_type = 'guest_post';  -- Only for guest posts since that's what was migrated

-- Log the change
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removed 14-day turnaround from % offerings', affected_count;
END $$;

-- Step 2: Remove 500-2000 word count defaults
UPDATE publisher_offerings
SET 
  min_word_count = CASE WHEN min_word_count = 500 THEN NULL ELSE min_word_count END,
  max_word_count = CASE WHEN max_word_count = 2000 THEN NULL ELSE max_word_count END,
  updated_at = NOW()
WHERE (min_word_count = 500 OR max_word_count = 2000)
  AND offering_type = 'guest_post';  -- Only for guest posts

-- Log the change
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removed word count defaults from % offerings', affected_count;
END $$;

-- Show final state
SELECT 'Final State After Migration' as status;
SELECT 
  COUNT(*) as total_offerings,
  SUM(CASE WHEN turnaround_days = 14 THEN 1 ELSE 0 END) as still_14_days,
  SUM(CASE WHEN min_word_count = 500 THEN 1 ELSE 0 END) as still_500_min,
  SUM(CASE WHEN max_word_count = 2000 THEN 1 ELSE 0 END) as still_2000_max,
  SUM(CASE WHEN turnaround_days IS NULL THEN 1 ELSE 0 END) as null_turnaround,
  SUM(CASE WHEN min_word_count IS NULL THEN 1 ELSE 0 END) as null_min_words,
  SUM(CASE WHEN max_word_count IS NULL THEN 1 ELSE 0 END) as null_max_words
FROM publisher_offerings
WHERE offering_type = 'guest_post';

COMMIT;