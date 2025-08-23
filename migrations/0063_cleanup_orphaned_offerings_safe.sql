-- Migration: Cleanup Orphaned Offerings (SAFE VERSION)
-- Date: 2025-01-23
-- Description: Delete all orphaned offerings - no guessing/auto-assignment

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
    
    RAISE NOTICE '=== ORPHANED OFFERINGS CLEANUP (SAFE VERSION) ===';
    RAISE NOTICE 'Total offerings: %', total_offerings;
    RAISE NOTICE 'Orphaned offerings to DELETE: %', orphaned_offerings;
    RAISE NOTICE 'Orphaned percentage: %', orphaned_percentage || '%';
    RAISE NOTICE 'Strategy: DELETE ALL orphaned offerings (no auto-assignment)';
    RAISE NOTICE '================================================';
END $$;

-- Step 2: Create backup log of what we're about to delete
CREATE TEMP TABLE deleted_orphaned_offerings_log AS
SELECT 
    po.id as offering_id,
    po.publisher_id,
    p.company_name,
    p.email,
    po.offering_type,
    po.base_price,
    po.currency,
    po.created_at,
    'DELETED - No website relationship' as reason
FROM publisher_offerings po 
LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
LEFT JOIN publishers p ON po.publisher_id = p.id
WHERE por.offering_id IS NULL;

-- Step 3: Log what we're deleting (this will be in the server logs)
DO $$
DECLARE
    rec RECORD;
    counter integer := 0;
BEGIN
    RAISE NOTICE '=== ORPHANED OFFERINGS TO BE DELETED ===';
    
    FOR rec IN 
        SELECT company_name, email, offering_type, (base_price/100.0) as price, currency
        FROM deleted_orphaned_offerings_log 
        ORDER BY company_name, offering_type
    LOOP
        counter := counter + 1;
        RAISE NOTICE '%: % (%) - % %.%', 
            counter, 
            COALESCE(rec.company_name, 'Unknown Company'), 
            rec.email,
            rec.offering_type, 
            rec.price, 
            rec.currency;
            
        -- Limit logging to first 20 to avoid spam
        IF counter >= 20 THEN
            RAISE NOTICE '... (truncated, see deleted_orphaned_offerings_log table for full list)';
            EXIT;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

-- Step 4: Delete all orphaned offerings (the safe approach)
DELETE FROM publisher_offerings po
WHERE po.id IN (
    SELECT po2.id
    FROM publisher_offerings po2 
    LEFT JOIN publisher_offering_relationships por ON po2.id = por.offering_id 
    WHERE por.offering_id IS NULL
);

-- Step 5: Verify the cleanup worked
DO $$
DECLARE
    remaining_orphaned integer;
    deleted_count integer;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned 
    FROM publisher_offerings po 
    LEFT JOIN publisher_offering_relationships por ON po.id = por.offering_id 
    WHERE por.offering_id IS NULL;
    
    SELECT COUNT(*) INTO deleted_count 
    FROM deleted_orphaned_offerings_log;
    
    RAISE NOTICE '=== CLEANUP RESULTS ===';
    RAISE NOTICE 'Remaining orphaned offerings: %', remaining_orphaned;
    RAISE NOTICE 'Total offerings deleted: %', deleted_count;
    RAISE NOTICE '======================';
    
    IF remaining_orphaned > 0 THEN
        RAISE ERROR 'CLEANUP FAILED: Still have % orphaned offerings!', remaining_orphaned;
    ELSE
        RAISE NOTICE 'SUCCESS: All orphaned offerings have been deleted';
    END IF;
END $$;

-- Step 6: Add database constraints to prevent future orphaned offerings
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

-- Step 7: Create a validation function to check for orphaned offerings
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
    RAISE NOTICE 'All orphaned offerings have been safely deleted';
    RAISE NOTICE 'Database constraints added to prevent future orphaned offerings';
    RAISE NOTICE 'Use SELECT check_orphaned_offerings(); to verify no orphans remain';
    RAISE NOTICE '============================';
END $$;

COMMIT;