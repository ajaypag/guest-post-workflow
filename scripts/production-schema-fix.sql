-- PRODUCTION DATABASE SCHEMA FIX SCRIPT
-- ⚠️ IMPORTANT: Run production-schema-check.sql FIRST to verify current state
-- Date: 2025-02-17
-- Purpose: Fix schema inconsistencies in production database

-- ============================================
-- SAFETY CHECKS (Will abort if conditions not met)
-- ============================================
DO $$
BEGIN
  -- Check that publisher_offerings table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'publisher_offerings'
  ) THEN
    RAISE EXCEPTION 'Table publisher_offerings does not exist. Aborting.';
  END IF;

  -- Check that we have the correct structure (publisher_id, not publisher_website_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' 
    AND column_name = 'publisher_website_id'
  ) THEN
    RAISE EXCEPTION 'Table has publisher_website_id column - wrong schema version! Aborting.';
  END IF;

  -- Check that publisher_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' 
    AND column_name = 'publisher_id'
  ) THEN
    RAISE EXCEPTION 'Table missing publisher_id column! Aborting.';
  END IF;

  RAISE NOTICE 'Safety checks passed. Proceeding with fixes...';
END $$;

-- ============================================
-- FIX 1: Add missing offering_name column if needed
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offerings' 
    AND column_name = 'offering_name'
  ) THEN
    ALTER TABLE publisher_offerings 
    ADD COLUMN offering_name VARCHAR(255);
    
    COMMENT ON COLUMN publisher_offerings.offering_name IS 'Custom name for the offering';
    RAISE NOTICE 'Added offering_name column to publisher_offerings';
  ELSE
    RAISE NOTICE 'offering_name column already exists';
  END IF;
END $$;

-- ============================================
-- FIX 2: Add missing columns to publisher_offering_relationships
-- ============================================
DO $$
BEGIN
  -- Add offering_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offering_relationships' 
    AND column_name = 'offering_id'
  ) THEN
    ALTER TABLE publisher_offering_relationships 
    ADD COLUMN offering_id UUID REFERENCES publisher_offerings(id);
    RAISE NOTICE 'Added offering_id column';
  END IF;

  -- Add contact fields if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offering_relationships' 
    AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE publisher_offering_relationships 
    ADD COLUMN contact_email VARCHAR(255),
    ADD COLUMN contact_phone VARCHAR(50),
    ADD COLUMN contact_name VARCHAR(255);
    RAISE NOTICE 'Added contact columns';
  END IF;

  -- Add notes fields if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offering_relationships' 
    AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE publisher_offering_relationships 
    ADD COLUMN internal_notes TEXT,
    ADD COLUMN publisher_notes TEXT;
    RAISE NOTICE 'Added notes columns';
  END IF;

  -- Add payment terms if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publisher_offering_relationships' 
    AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE publisher_offering_relationships 
    ADD COLUMN commission_rate VARCHAR(50),
    ADD COLUMN payment_terms VARCHAR(255);
    RAISE NOTICE 'Added payment terms columns';
  END IF;
END $$;

-- ============================================
-- FIX 3: Add indexes for performance
-- ============================================
DO $$
BEGIN
  -- Index on publisher_offerings.publisher_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'publisher_offerings' 
    AND indexname = 'idx_publisher_offerings_publisher_id'
  ) THEN
    CREATE INDEX idx_publisher_offerings_publisher_id 
    ON publisher_offerings(publisher_id);
    RAISE NOTICE 'Added index on publisher_offerings.publisher_id';
  END IF;

  -- Index on publisher_offering_relationships.publisher_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'publisher_offering_relationships' 
    AND indexname = 'idx_publisher_offering_rel_publisher'
  ) THEN
    CREATE INDEX idx_publisher_offering_rel_publisher 
    ON publisher_offering_relationships(publisher_id);
    RAISE NOTICE 'Added index on publisher_offering_relationships.publisher_id';
  END IF;

  -- Index on publisher_offering_relationships.website_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'publisher_offering_relationships' 
    AND indexname = 'idx_publisher_offering_rel_website'
  ) THEN
    CREATE INDEX idx_publisher_offering_rel_website 
    ON publisher_offering_relationships(website_id);
    RAISE NOTICE 'Added index on publisher_offering_relationships.website_id';
  END IF;
END $$;

-- ============================================
-- FIX 4: Clean up orphaned data
-- ============================================
-- Delete offerings without valid publishers
DELETE FROM publisher_offerings po
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = po.publisher_id
);

-- Delete relationships without valid publishers
DELETE FROM publisher_offering_relationships por
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = por.publisher_id
);

-- Delete relationships without valid websites
DELETE FROM publisher_offering_relationships por
WHERE NOT EXISTS (
  SELECT 1 FROM websites w WHERE w.id = por.website_id
);

-- ============================================
-- FIX 5: Set default values where needed
-- ============================================
UPDATE publisher_offerings 
SET offering_name = offering_type || ' Offering'
WHERE offering_name IS NULL;

UPDATE publisher_offering_relationships
SET relationship_type = 'contact'
WHERE relationship_type IS NULL;

UPDATE publisher_offering_relationships
SET verification_status = 'pending'
WHERE verification_status IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '=== FINAL VERIFICATION ===' as status;

-- Verify publisher_offerings structure
SELECT 
  'publisher_offerings' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT publisher_id) as unique_publishers,
  COUNT(offering_name) as has_offering_name
FROM publisher_offerings;

-- Verify publisher_offering_relationships structure
SELECT 
  'publisher_offering_relationships' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT publisher_id) as unique_publishers,
  COUNT(DISTINCT website_id) as unique_websites
FROM publisher_offering_relationships;

-- Check for any remaining issues
SELECT 
  'Orphaned offerings' as check_type,
  COUNT(*) as count
FROM publisher_offerings po
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = po.publisher_id
)
UNION ALL
SELECT 
  'Orphaned relationships' as check_type,
  COUNT(*) as count
FROM publisher_offering_relationships por
WHERE NOT EXISTS (
  SELECT 1 FROM publishers p WHERE p.id = por.publisher_id
);

SELECT '=== SCHEMA FIX COMPLETE ===' as status;