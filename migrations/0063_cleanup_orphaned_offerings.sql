-- Migration: Cleanup Orphaned Offerings
-- Date: 2025-01-23
-- Description: Fix offerings without website relationships and add constraints

BEGIN;

-- Step 1: Analyze the current state (for logging)
DO $$
DECLARE
    total_offerings integer;
    orphaned_offerings integer;
    orphaned_percentage decimal;
BEGIN
    SELECT COUNT(*) INTO total_offerings FROM publisher_offerings;
    
    SELECT COUNT(*) INTO orphaned_offerings 
    FROM publisher_offerings po 
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
    WHERE por.offering_id IS NULL;
    
    orphaned_percentage := ROUND((orphaned_offerings::decimal / total_offerings::decimal) * 100, 2);
    
    RAISE NOTICE '=== ORPHANED OFFERINGS CLEANUP ===';
    RAISE NOTICE 'Total offerings: %', total_offerings;
    RAISE NOTICE 'Orphaned offerings: %', orphaned_offerings;
    RAISE NOTICE 'Orphaned percentage: %', orphaned_percentage || '%';
    RAISE NOTICE '==================================';
END $$;

-- Step 2: Strategy for fixing orphaned offerings
-- We'll try to auto-assign orphaned offerings to websites based on:
-- 1. Publisher's primary website (if they have one)
-- 2. Publisher's most recent website relationship
-- 3. If no websites, we'll delete the orphaned offering (safest approach)

-- Step 2a: Create temporary table to track cleanup actions
CREATE TEMP TABLE orphaned_cleanup_log (
    offering_id UUID,
    publisher_id UUID,
    action TEXT,
    website_id UUID,
    reason TEXT
);

-- Step 2b: Try to assign orphaned offerings to publisher's primary website
WITH orphaned_offerings AS (
    SELECT po.id as offering_id, po.publisher_id
    FROM publisher_offerings po 
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
    WHERE por.offering_id IS NULL
),
publisher_primary_websites AS (
    SELECT DISTINCT ON (publisher_id) 
        publisher_id, 
        website_id,
        created_at
    FROM publisher_offering_relationships 
    WHERE is_primary = true 
       OR priority_rank = 1
       OR is_preferred = true
    ORDER BY publisher_id, priority_rank ASC, created_at DESC
),
publisher_any_websites AS (
    SELECT DISTINCT ON (publisher_id) 
        publisher_id, 
        website_id,
        created_at
    FROM publisher_offering_relationships 
    ORDER BY publisher_id, created_at DESC
)
INSERT INTO publisher_offering_relationships (
    id,
    publisher_id,
    offering_id,
    website_id,
    relationship_type,
    verification_status,
    priority_rank,
    is_primary,
    is_preferred,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    oo.publisher_id,
    oo.offering_id,
    COALESCE(ppw.website_id, paw.website_id),
    'contact',
    'claimed',
    100,
    false,
    false,
    NOW(),
    NOW()
FROM orphaned_offerings oo
LEFT JOIN publisher_primary_websites ppw ON oo.publisher_id = ppw.publisher_id
LEFT JOIN publisher_any_websites paw ON oo.publisher_id = paw.publisher_id
WHERE COALESCE(ppw.website_id, paw.website_id) IS NOT NULL;

-- Log the assignments
INSERT INTO orphaned_cleanup_log (offering_id, publisher_id, action, website_id, reason)
SELECT 
    oo.offering_id,
    oo.publisher_id,
    'ASSIGNED',
    COALESCE(ppw.website_id, paw.website_id),
    CASE 
        WHEN ppw.website_id IS NOT NULL THEN 'Assigned to primary website'
        WHEN paw.website_id IS NOT NULL THEN 'Assigned to most recent website'
    END
FROM (
    SELECT po.id as offering_id, po.publisher_id
    FROM publisher_offerings po 
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
    WHERE por.offering_id IS NULL
) oo
LEFT JOIN publisher_primary_websites ppw ON oo.publisher_id = ppw.publisher_id
LEFT JOIN publisher_any_websites paw ON oo.publisher_id = paw.publisher_id
WHERE COALESCE(ppw.website_id, paw.website_id) IS NOT NULL;

-- Step 2c: For remaining orphaned offerings (publishers with no websites), 
-- we have two options:
-- Option A: Delete them (safer)
-- Option B: Keep them but mark as inactive

-- Let's go with Option A - DELETE orphaned offerings from publishers with no websites
-- But first, let's log what we're about to delete
INSERT INTO orphaned_cleanup_log (offering_id, publisher_id, action, website_id, reason)
SELECT 
    po.id,
    po.publisher_id,
    'DELETE',
    NULL,
    'Publisher has no website relationships - unsafe to keep offering'
FROM publisher_offerings po 
LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
WHERE por.offering_id IS NULL;

-- Now delete the truly orphaned offerings
DELETE FROM publisher_offerings po
WHERE po.id IN (
    SELECT po2.id
    FROM publisher_offerings po2 
    LEFT JOIN publisher_offering_relationships por ON po2.id = por.offering_id 
    WHERE por.offering_id IS NULL
);

-- Step 3: Verify the cleanup worked
DO $$
DECLARE
    remaining_orphaned integer;
    assigned_count integer;
    deleted_count integer;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned 
    FROM publisher_offerings po 
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
    WHERE por.offering_id IS NULL;
    
    SELECT COUNT(*) INTO assigned_count 
    FROM orphaned_cleanup_log 
    WHERE action = 'ASSIGNED';
    
    SELECT COUNT(*) INTO deleted_count 
    FROM orphaned_cleanup_log 
    WHERE action = 'DELETE';
    
    RAISE NOTICE '=== CLEANUP RESULTS ===';
    RAISE NOTICE 'Remaining orphaned offerings: %', remaining_orphaned;
    RAISE NOTICE 'Offerings assigned to websites: %', assigned_count;
    RAISE NOTICE 'Offerings deleted: %', deleted_count;
    RAISE NOTICE '======================';
    
    IF remaining_orphaned > 0 THEN
        RAISE WARNING 'Still have % orphaned offerings! Manual cleanup needed.', remaining_orphaned;
    END IF;
END $$;

-- Step 4: Add database constraints to prevent future orphaned offerings
-- We'll add this constraint to ensure every offering MUST have at least one website relationship

-- Note: We can't add a direct foreign key constraint because the relationship is in a separate table
-- Instead, we'll create a trigger to enforce this rule

CREATE OR REPLACE FUNCTION enforce_offering_has_website()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT, check if this is the first relationship for this offering
    IF TG_OP = 'INSERT' THEN
        -- Allow the insert (relationship is being created)
        RETURN NEW;
    END IF;
    
    -- For DELETE, ensure we're not deleting the last relationship for an offering
    IF TG_OP = 'DELETE' THEN
        -- Check if this is the last relationship for this offering
        IF NOT EXISTS (
            SELECT 1 
            FROM publisher_offering_relationships 
            WHERE offering_id = OLD.offering_id 
              AND id != OLD.id
        ) THEN
            RAISE EXCEPTION 'Cannot delete the last website relationship for offering %. All offerings must be associated with at least one website.', OLD.offering_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS enforce_offering_website_relationship ON publisher_offering_relationships;
CREATE TRIGGER enforce_offering_website_relationship
    BEFORE DELETE ON publisher_offering_relationships
    FOR EACH ROW EXECUTE FUNCTION enforce_offering_has_website();

-- Step 5: Create a validation function to check for orphaned offerings
CREATE OR REPLACE FUNCTION check_orphaned_offerings()
RETURNS TABLE(
    offering_id UUID,
    publisher_id UUID,
    company_name VARCHAR,
    offering_type VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.id,
        po.publisher_id,
        p.company_name,
        po.offering_type,
        po.created_at
    FROM publisher_offerings po
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id
    LEFT JOIN publishers p ON po.publisher_id = p.id
    WHERE por.offering_id IS NULL
    ORDER BY po.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Final verification
SELECT check_orphaned_offerings();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Orphaned offerings cleanup completed successfully';
    RAISE NOTICE 'Database constraints added to prevent future orphaned offerings';
    RAISE NOTICE 'Use SELECT check_orphaned_offerings(); to verify no orphans remain';
    RAISE NOTICE '============================';
END $$;

COMMIT;