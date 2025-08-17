-- Migration: Domain Normalization and Constraints Fix
-- Purpose: Ensure domain uniqueness and normalize existing domains
-- Date: 2025-01-14

-- Step 1: Add normalized_domain column to websites table
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255);

-- Step 2: Create function to normalize domains
CREATE OR REPLACE FUNCTION normalize_domain(input_domain TEXT) 
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    -- Convert to lowercase
    normalized := LOWER(TRIM(input_domain));
    
    -- Remove protocol
    normalized := REGEXP_REPLACE(normalized, '^https?://', '');
    
    -- Remove www prefix
    normalized := REGEXP_REPLACE(normalized, '^www\.', '');
    
    -- Remove trailing slash and path
    normalized := REGEXP_REPLACE(normalized, '/.*$', '');
    
    -- Remove port
    normalized := REGEXP_REPLACE(normalized, ':[0-9]+$', '');
    
    RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Populate normalized_domain for existing records
UPDATE websites 
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain IS NULL;

-- Step 4: Create index on normalized_domain
CREATE INDEX IF NOT EXISTS idx_websites_normalized_domain 
ON websites(normalized_domain);

-- Step 5: Check for duplicates before adding unique constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT normalized_domain, COUNT(*) as cnt
        FROM websites
        WHERE normalized_domain IS NOT NULL
        GROUP BY normalized_domain
        HAVING COUNT(*) > 1
    ) as duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate normalized domains. Please resolve before adding unique constraint.', duplicate_count;
        
        -- Log duplicates for review
        CREATE TABLE IF NOT EXISTS domain_duplicates_to_resolve (
            normalized_domain VARCHAR(255),
            website_ids UUID[],
            domains TEXT[],
            count INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        INSERT INTO domain_duplicates_to_resolve (normalized_domain, website_ids, domains, count)
        SELECT 
            w.normalized_domain,
            ARRAY_AGG(w.id),
            ARRAY_AGG(w.domain),
            COUNT(*)
        FROM websites w
        WHERE w.normalized_domain IN (
            SELECT normalized_domain
            FROM websites
            WHERE normalized_domain IS NOT NULL
            GROUP BY normalized_domain
            HAVING COUNT(*) > 1
        )
        GROUP BY w.normalized_domain;
        
        RAISE NOTICE 'Duplicate domains logged to domain_duplicates_to_resolve table for manual review.';
    ELSE
        -- No duplicates, safe to add constraint
        ALTER TABLE websites 
        ADD CONSTRAINT unique_normalized_domain 
        UNIQUE (normalized_domain);
        
        RAISE NOTICE 'Unique constraint added successfully.';
    END IF;
END $$;

-- Step 6: Add trigger to auto-normalize on insert/update
CREATE OR REPLACE FUNCTION trigger_normalize_domain()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_domain := normalize_domain(NEW.domain);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_domain_trigger ON websites;
CREATE TRIGGER normalize_domain_trigger
BEFORE INSERT OR UPDATE OF domain ON websites
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_domain();

-- Step 7: Add similar normalization for bulk_analysis_domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255);

UPDATE bulk_analysis_domains 
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain IS NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_normalized_domain 
ON bulk_analysis_domains(normalized_domain);

-- Step 8: Add validation check constraint
ALTER TABLE websites
ADD CONSTRAINT check_valid_domain
CHECK (domain ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');

-- Step 9: Create helper view for domain management
CREATE OR REPLACE VIEW website_domain_summary AS
SELECT 
    w.id,
    w.domain,
    w.normalized_domain,
    w.domain_rating,
    w.total_traffic,
    COUNT(DISTINCT por.publisher_id) as publisher_count,
    COUNT(DISTINCT po.id) as offering_count,
    w.quality_verified,
    w.created_at,
    w.updated_at
FROM websites w
LEFT JOIN publisher_offering_relationships por ON por.website_id = w.id
LEFT JOIN publisher_offerings po ON po.publisher_relationship_id = por.id
GROUP BY w.id;

-- Step 10: Add comments for documentation
COMMENT ON COLUMN websites.normalized_domain IS 'Domain normalized for uniqueness checking (lowercase, no www/protocol)';
COMMENT ON FUNCTION normalize_domain IS 'Normalizes domain for consistent storage and comparison';
COMMENT ON TABLE domain_duplicates_to_resolve IS 'Temporary table for resolving duplicate domains before unique constraint';

-- Summary message
DO $$
BEGIN
    RAISE NOTICE 'Domain normalization migration completed.';
    RAISE NOTICE 'Check domain_duplicates_to_resolve table for any conflicts.';
    RAISE NOTICE 'Use normalize_domain() function for consistent domain handling.';
END $$;