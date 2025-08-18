-- PRODUCTION DATABASE SCHEMA CHECK SCRIPT
-- Run this on PRODUCTION to verify the current state before fixes
-- Date: 2025-02-17

-- ============================================
-- 1. CHECK WHAT PUBLISHER TABLES EXIST
-- ============================================
SELECT '=== PUBLISHER TABLES ===' as check_type;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'publisher%'
ORDER BY table_name;

-- ============================================
-- 2. CHECK PUBLISHER_OFFERINGS STRUCTURE
-- ============================================
SELECT '=== PUBLISHER_OFFERINGS COLUMNS ===' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'publisher_offerings'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK PUBLISHER_OFFERING_RELATIONSHIPS STRUCTURE
-- ============================================
SELECT '=== PUBLISHER_OFFERING_RELATIONSHIPS COLUMNS ===' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'publisher_offering_relationships'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK FOR CRITICAL COLUMNS
-- ============================================
SELECT '=== CRITICAL COLUMN CHECK ===' as check_type;
SELECT 
  'publisher_offerings.publisher_id' as column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' AND column_name = 'publisher_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'publisher_offerings.offering_name' as column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' AND column_name = 'offering_name'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'publisher_offerings.publisher_website_id' as column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' AND column_name = 'publisher_website_id'
  ) THEN 'EXISTS (PROBLEM!)' ELSE 'NOT EXISTS (GOOD)' END as status;

-- ============================================
-- 5. CHECK FOREIGN KEY RELATIONSHIPS
-- ============================================
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as check_type;
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name LIKE 'publisher%'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 6. CHECK DATA COUNTS
-- ============================================
SELECT '=== DATA COUNTS ===' as check_type;
SELECT 'publishers' as table_name, COUNT(*) as row_count FROM publishers
UNION ALL
SELECT 'publisher_offerings', COUNT(*) FROM publisher_offerings
UNION ALL
SELECT 'publisher_offering_relationships', COUNT(*) FROM publisher_offering_relationships
UNION ALL
SELECT 'websites', COUNT(*) FROM websites
ORDER BY table_name;

-- ============================================
-- 7. CHECK FOR ORPHANED DATA
-- ============================================
SELECT '=== ORPHANED DATA CHECK ===' as check_type;
-- Check for offerings without valid publishers
SELECT 'Offerings with invalid publisher_id' as check_type,
       COUNT(*) as count
FROM publisher_offerings po
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = po.publisher_id
);

-- Check for relationships without valid publishers
SELECT 'Relationships with invalid publisher_id' as check_type,
       COUNT(*) as count
FROM publisher_offering_relationships por
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = por.publisher_id
);

-- ============================================
-- 8. MIGRATION HISTORY (if exists)
-- ============================================
SELECT '=== MIGRATION HISTORY ===' as check_type;
-- Check if drizzle_migrations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'drizzle_migrations'
  ) THEN
    RAISE NOTICE 'Migration table exists';
    -- Would need dynamic SQL here to query it
  ELSE
    RAISE NOTICE 'No migration table found (manual migrations used)';
  END IF;
END $$;