-- Domain Normalization for Existing Data
-- This migration normalizes domains WITHOUT deleting any data

-- Step 1: Add normalized_domain column (nullable initially)
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255);

ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255);

-- Step 2: Create normalization function
CREATE OR REPLACE FUNCTION normalize_domain(input_domain TEXT) 
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    IF input_domain IS NULL OR input_domain = '' THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase
    normalized := LOWER(TRIM(input_domain));
    
    -- Remove protocol
    normalized := REGEXP_REPLACE(normalized, '^https?://', '');
    
    -- Remove www prefix (but keep other subdomains like blog, shop, etc)
    normalized := REGEXP_REPLACE(normalized, '^www\.', '');
    
    -- Remove trailing slash and path
    normalized := REGEXP_REPLACE(normalized, '/.*$', '');
    
    -- Remove port
    normalized := REGEXP_REPLACE(normalized, ':[0-9]+$', '');
    
    -- Remove any trailing dots
    normalized := RTRIM(normalized, '.');
    
    RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Normalize existing domains
UPDATE websites 
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain IS NULL;

UPDATE bulk_analysis_domains
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain IS NULL;

-- Step 4: Check for duplicates and report them
DO $$
DECLARE
    duplicate_count INTEGER;
    duplicate_record RECORD;
BEGIN
    -- Count duplicate normalized domains in websites
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT normalized_domain, COUNT(*) as cnt
        FROM websites
        WHERE normalized_domain IS NOT NULL
        GROUP BY normalized_domain
        HAVING COUNT(*) > 1
    ) as dups;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE '⚠️  Found % groups of duplicate websites after normalization', duplicate_count;
        RAISE NOTICE 'Duplicate websites (showing first 10):';
        
        -- Show some examples
        FOR duplicate_record IN 
            SELECT 
                normalized_domain,
                STRING_AGG(domain, ', ') as original_domains,
                COUNT(*) as count
            FROM websites
            WHERE normalized_domain IS NOT NULL
            GROUP BY normalized_domain
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10
        LOOP
            RAISE NOTICE '  - % appears % times: %', 
                duplicate_record.normalized_domain, 
                duplicate_record.count,
                duplicate_record.original_domains;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'To handle duplicates, you can:';
        RAISE NOTICE '1. Review and merge manually using the admin panel';
        RAISE NOTICE '2. Keep all versions (different subdomains might be intentional)';
        RAISE NOTICE '3. Run the deduplication script (separate migration)';
        
    ELSE
        RAISE NOTICE '✅ No duplicate normalized domains found in websites table!';
    END IF;
END $$;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_websites_normalized_domain 
ON websites(normalized_domain);

CREATE INDEX IF NOT EXISTS idx_bulk_normalized_domain 
ON bulk_analysis_domains(normalized_domain);

-- Step 6: Add trigger for future inserts/updates
CREATE OR REPLACE FUNCTION trigger_normalize_domain()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_domain := normalize_domain(NEW.domain);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites;
CREATE TRIGGER normalize_website_domain_trigger
BEFORE INSERT OR UPDATE OF domain ON websites
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_domain();

DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains;
CREATE TRIGGER normalize_bulk_domain_trigger
BEFORE INSERT OR UPDATE OF domain ON bulk_analysis_domains
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_domain();

-- Step 7: Create helper functions for domain lookups
CREATE OR REPLACE FUNCTION find_website_by_domain(input_domain TEXT)
RETURNS SETOF websites AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM websites 
    WHERE normalized_domain = normalize_domain(input_domain)
    LIMIT 1;  -- Return first match if duplicates exist
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create duplicate management view
CREATE OR REPLACE VIEW duplicate_websites AS
SELECT 
    normalized_domain,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as website_ids,
    ARRAY_AGG(domain ORDER BY created_at) as original_domains,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM websites
WHERE normalized_domain IS NOT NULL
GROUP BY normalized_domain
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Step 9: Update statistics
ANALYZE websites;
ANALYZE bulk_analysis_domains;

-- Summary
DO $$
DECLARE
    total_websites INTEGER;
    normalized_count INTEGER;
    duplicate_groups INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_websites FROM websites;
    SELECT COUNT(*) INTO normalized_count FROM websites WHERE normalized_domain IS NOT NULL;
    SELECT COUNT(*) INTO duplicate_groups FROM duplicate_websites;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Domain Normalization Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total websites: %', total_websites;
    RAISE NOTICE 'Normalized: %', normalized_count;
    RAISE NOTICE 'Duplicate groups found: %', duplicate_groups;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review duplicates: SELECT * FROM duplicate_websites;';
    RAISE NOTICE '2. Update code to use normalized_domain for lookups';
    RAISE NOTICE '3. Consider adding unique constraint after deduplication';
    RAISE NOTICE '========================================';
END $$;