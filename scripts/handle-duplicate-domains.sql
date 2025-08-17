-- Script to Handle Duplicate Domains After Normalization
-- Run this AFTER migration 0037 to review and handle duplicates

-- View all duplicates
SELECT 
    normalized_domain,
    duplicate_count,
    original_domains
FROM duplicate_websites
ORDER BY duplicate_count DESC;

-- Detailed view of a specific duplicate group
-- Replace 'example.com' with the normalized domain you want to inspect
/*
SELECT 
    w.*,
    COUNT(por.id) as publisher_relationships,
    COUNT(DISTINCT por.publisher_id) as unique_publishers
FROM websites w
LEFT JOIN publisher_offering_relationships por ON por.website_id = w.id
WHERE w.normalized_domain = 'example.com'
GROUP BY w.id
ORDER BY w.created_at;
*/

-- Function to merge duplicate websites (keeps the best one)
CREATE OR REPLACE FUNCTION merge_duplicate_websites(target_normalized_domain TEXT)
RETURNS TEXT AS $$
DECLARE
    keeper_id UUID;
    duplicate_ids UUID[];
    merge_count INTEGER;
BEGIN
    -- Find the "best" website to keep (most data, highest DR, most relationships)
    SELECT id INTO keeper_id
    FROM websites w
    WHERE w.normalized_domain = target_normalized_domain
    ORDER BY 
        (CASE WHEN domain_rating IS NOT NULL THEN 1 ELSE 0 END) DESC,
        domain_rating DESC NULLS LAST,
        total_traffic DESC NULLS LAST,
        (SELECT COUNT(*) FROM publisher_offering_relationships WHERE website_id = w.id) DESC,
        created_at ASC  -- Oldest if all else equal
    LIMIT 1;
    
    -- Get all other duplicate IDs
    SELECT ARRAY_AGG(id) INTO duplicate_ids
    FROM websites
    WHERE normalized_domain = target_normalized_domain
    AND id != keeper_id;
    
    IF array_length(duplicate_ids, 1) IS NULL THEN
        RETURN 'No duplicates found for ' || target_normalized_domain;
    END IF;
    
    -- Merge publisher relationships
    UPDATE publisher_offering_relationships
    SET website_id = keeper_id
    WHERE website_id = ANY(duplicate_ids)
    AND NOT EXISTS (
        -- Don't create duplicate relationships
        SELECT 1 FROM publisher_offering_relationships por2
        WHERE por2.website_id = keeper_id
        AND por2.publisher_id = publisher_offering_relationships.publisher_id
    );
    
    -- Log the merge
    INSERT INTO website_merge_log (
        normalized_domain,
        keeper_id,
        merged_ids,
        merge_date
    ) VALUES (
        target_normalized_domain,
        keeper_id,
        duplicate_ids,
        NOW()
    );
    
    -- Soft delete the duplicates (or hard delete if you prefer)
    UPDATE websites
    SET 
        domain = domain || '_MERGED_' || substring(id::text from 1 for 8),
        normalized_domain = normalized_domain || '_MERGED_' || substring(id::text from 1 for 8)
    WHERE id = ANY(duplicate_ids);
    
    GET DIAGNOSTICS merge_count = ROW_COUNT;
    
    RETURN format('Merged %s duplicates into website %s for domain %s', 
        merge_count, keeper_id, target_normalized_domain);
END;
$$ LANGUAGE plpgsql;

-- Create log table for merge history
CREATE TABLE IF NOT EXISTS website_merge_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_domain VARCHAR(255),
    keeper_id UUID,
    merged_ids UUID[],
    merge_date TIMESTAMP DEFAULT NOW()
);

-- Example: Merge all duplicates automatically (BE CAREFUL!)
/*
DO $$
DECLARE
    dup_record RECORD;
    result TEXT;
BEGIN
    FOR dup_record IN 
        SELECT normalized_domain 
        FROM duplicate_websites
        ORDER BY duplicate_count DESC
    LOOP
        result := merge_duplicate_websites(dup_record.normalized_domain);
        RAISE NOTICE '%', result;
    END LOOP;
END $$;
*/

-- After merging, you can add the unique constraint
/*
ALTER TABLE websites 
ADD CONSTRAINT unique_normalized_domain 
UNIQUE (normalized_domain)
WHERE normalized_domain NOT LIKE '%_MERGED_%';
*/

-- View merge history
/*
SELECT 
    normalized_domain,
    keeper_id,
    array_length(merged_ids, 1) as merged_count,
    merge_date
FROM website_merge_log
ORDER BY merge_date DESC;
*/