-- Migration: Fix Publisher Migration Issues
-- This migration fixes two major issues from the shadow publisher migration:
-- 1. Migrates website relationships from publisher_websites to publisher_offering_relationships (correct table for UI)
-- 2. Improves publisher names/contact info where email was used for everything

BEGIN;

-- =========================================
-- STEP 1: Migrate website relationships to correct table
-- =========================================

-- Insert missing relationships from publisher_websites to publisher_offering_relationships
INSERT INTO publisher_offering_relationships (
    id,
    publisher_id,
    website_id,
    offering_id,
    relationship_type,
    verification_status,
    priority_rank,
    is_preferred,
    is_primary,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    pw.publisher_id,
    pw.website_id,
    NULL as offering_id, -- No offering yet, will be linked later
    'owner' as relationship_type, -- Publishers own their websites
    CASE 
        WHEN p.account_status = 'active' THEN 'verified'
        WHEN p.account_status = 'shadow' THEN 'claimed'
        ELSE 'pending'
    END as verification_status,
    50 as priority_rank, -- Default medium priority
    true as is_preferred, -- Mark as preferred since they're the owner
    true as is_primary, -- Mark as primary relationship
    pw.status = 'active' as is_active,
    pw.added_at as created_at,
    COALESCE(pw.added_at, NOW()) as updated_at
FROM publisher_websites pw
INNER JOIN publishers p ON p.id = pw.publisher_id
WHERE NOT EXISTS (
    -- Only migrate if relationship doesn't already exist
    SELECT 1 
    FROM publisher_offering_relationships por 
    WHERE por.publisher_id = pw.publisher_id 
    AND por.website_id = pw.website_id
);

-- Log migration stats
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % website relationships to publisher_offering_relationships', migrated_count;
END $$;

-- =========================================
-- STEP 2: Improve publisher contact information
-- =========================================

-- Extract better contact names from email addresses where possible
UPDATE publishers
SET 
    contact_name = CASE
        -- If contact_name is just the email, try to extract a better name
        WHEN contact_name = email THEN
            CASE
                -- Extract name from email like "john.doe@example.com" -> "John Doe"
                WHEN email LIKE '%@%' AND position('.' in split_part(email, '@', 1)) > 0 THEN
                    initcap(replace(split_part(email, '@', 1), '.', ' '))
                -- Extract name from email like "johndoe@example.com" -> "Johndoe"
                WHEN email LIKE '%@%' THEN
                    initcap(split_part(email, '@', 1))
                ELSE contact_name
            END
        ELSE contact_name
    END,
    company_name = CASE
        -- If company_name is just the email, try to extract domain as company
        WHEN company_name = email THEN
            CASE
                -- Extract domain and make it a company name
                WHEN email LIKE '%@%' THEN
                    initcap(replace(split_part(split_part(email, '@', 2), '.', 1), '-', ' ')) || ' Publishing'
                ELSE company_name
            END
        ELSE company_name
    END,
    updated_at = NOW()
WHERE 
    -- Only update shadow publishers created by migration
    source = 'legacy_migration' 
    AND account_status = 'shadow'
    AND (contact_name = email OR company_name = email);

-- Log update stats
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % publisher records with better names', updated_count;
END $$;

-- =========================================
-- STEP 3: Link existing offerings to websites
-- =========================================

-- For publishers that have offerings but no website links in the offerings
UPDATE publisher_offering_relationships por
SET offering_id = (
    SELECT po.id 
    FROM publisher_offerings po 
    WHERE po.publisher_id = por.publisher_id 
    AND po.is_active = true
    LIMIT 1
)
WHERE 
    por.offering_id IS NULL
    AND EXISTS (
        SELECT 1 
        FROM publisher_offerings po 
        WHERE po.publisher_id = por.publisher_id
    );

-- =========================================
-- STEP 4: Create default offerings for publishers without any
-- =========================================

-- Create a default guest post offering for publishers who have websites but no offerings
INSERT INTO publisher_offerings (
    id,
    publisher_id,
    offering_type,
    base_price,
    currency,
    turnaround_days,
    current_availability,
    is_active,
    created_at,
    updated_at
)
SELECT DISTINCT
    gen_random_uuid() as id,
    por.publisher_id,
    'guest_post' as offering_type,
    COALESCE(
        -- Try to get price from websites table
        (SELECT AVG(w.guest_post_cost::numeric)
         FROM publisher_offering_relationships por2
         JOIN websites w ON w.id = por2.website_id
         WHERE por2.publisher_id = por.publisher_id
         AND w.guest_post_cost IS NOT NULL),
        250.00 -- Default price if no data
    ) as base_price,
    'USD' as currency,
    COALESCE(
        -- Try to get turnaround from websites table
        (SELECT CEIL(AVG(w.avg_response_time_hours) / 24)
         FROM publisher_offering_relationships por2
         JOIN websites w ON w.id = por2.website_id
         WHERE por2.publisher_id = por.publisher_id
         AND w.avg_response_time_hours IS NOT NULL),
        7 -- Default 7 days if no data
    ) as turnaround_days,
    'available' as current_availability,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM publisher_offering_relationships por
WHERE NOT EXISTS (
    -- Only create if publisher has no offerings
    SELECT 1 
    FROM publisher_offerings po 
    WHERE po.publisher_id = por.publisher_id
)
GROUP BY por.publisher_id;

-- Now link these new offerings back to the relationships
UPDATE publisher_offering_relationships por
SET offering_id = (
    SELECT po.id 
    FROM publisher_offerings po 
    WHERE po.publisher_id = por.publisher_id 
    AND po.offering_type = 'guest_post'
    LIMIT 1
)
WHERE por.offering_id IS NULL;

-- =========================================
-- STEP 5: Verification and Cleanup
-- =========================================

-- Verify migration success
DO $$
DECLARE
    orphaned_relationships INTEGER;
    publishers_without_websites INTEGER;
    offerings_without_relationships INTEGER;
BEGIN
    -- Check for orphaned relationships
    SELECT COUNT(*) INTO orphaned_relationships
    FROM publisher_offering_relationships
    WHERE offering_id IS NULL;
    
    -- Check for publishers without websites
    SELECT COUNT(*) INTO publishers_without_websites
    FROM publishers p
    WHERE p.source = 'legacy_migration'
    AND NOT EXISTS (
        SELECT 1 FROM publisher_offering_relationships por
        WHERE por.publisher_id = p.id
    );
    
    -- Check for offerings without relationships
    SELECT COUNT(*) INTO offerings_without_relationships
    FROM publisher_offerings po
    WHERE NOT EXISTS (
        SELECT 1 FROM publisher_offering_relationships por
        WHERE por.offering_id = po.id
    );
    
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '  - Orphaned relationships (no offering): %', orphaned_relationships;
    RAISE NOTICE '  - Publishers without websites: %', publishers_without_websites;
    RAISE NOTICE '  - Offerings without relationships: %', offerings_without_relationships;
END $$;

-- =========================================
-- Final Statistics
-- =========================================

-- Show migration results
SELECT 
    'Migration Results' as metric,
    COUNT(DISTINCT por.publisher_id) as publishers_with_websites,
    COUNT(DISTINCT por.website_id) as total_websites,
    COUNT(DISTINCT por.offering_id) as total_offerings,
    COUNT(*) as total_relationships
FROM publisher_offering_relationships por
WHERE por.created_at >= NOW() - INTERVAL '1 hour';

COMMIT;

-- =========================================
-- ROLLBACK COMMANDS (if needed)
-- =========================================
-- To rollback this migration, run:
/*
BEGIN;

-- Remove newly created relationships
DELETE FROM publisher_offering_relationships 
WHERE created_at >= '2025-08-23' 
AND relationship_type = 'owner'
AND id IN (
    SELECT por.id 
    FROM publisher_offering_relationships por
    JOIN publisher_websites pw 
    ON por.publisher_id = pw.publisher_id 
    AND por.website_id = pw.website_id
);

-- Revert name changes
UPDATE publishers
SET 
    contact_name = email,
    company_name = email
WHERE 
    source = 'legacy_migration' 
    AND account_status = 'shadow';

-- Remove auto-created offerings
DELETE FROM publisher_offerings
WHERE created_at >= '2025-08-23'
AND offering_type = 'guest_post'
AND base_price IN (250.00);

COMMIT;
*/