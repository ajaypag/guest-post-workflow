-- Clean Domain Setup Migration (For Fresh System)
-- Since we have no production data, we can do this right from the start!

-- Step 1: Clear any test data (careful - this deletes everything!)
-- TRUNCATE websites CASCADE;
-- TRUNCATE bulk_analysis_domains CASCADE;
-- TRUNCATE orders CASCADE;
-- TRUNCATE guest_post_items CASCADE;
-- TRUNCATE publishers CASCADE;
-- TRUNCATE publisher_offering_relationships CASCADE;

-- Step 2: Add normalized domain columns with NOT NULL constraint
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS normalized_domain VARCHAR(255) NOT NULL DEFAULT '';

-- Step 3: Create normalization function
CREATE OR REPLACE FUNCTION normalize_domain(input_domain TEXT) 
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    -- Convert to lowercase
    normalized := LOWER(TRIM(input_domain));
    
    -- Remove protocol
    normalized := REGEXP_REPLACE(normalized, '^https?://', '');
    
    -- Remove www prefix (but keep other subdomains)
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

-- Step 4: Update any existing test data
UPDATE websites 
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain = '';

UPDATE bulk_analysis_domains
SET normalized_domain = normalize_domain(domain)
WHERE normalized_domain = '';

-- Step 5: Add UNIQUE constraints (no duplicates to worry about!)
ALTER TABLE websites 
DROP CONSTRAINT IF EXISTS unique_normalized_domain;

ALTER TABLE websites 
ADD CONSTRAINT unique_normalized_domain 
UNIQUE (normalized_domain);

ALTER TABLE bulk_analysis_domains
DROP CONSTRAINT IF EXISTS unique_bulk_normalized_domain;

ALTER TABLE bulk_analysis_domains
ADD CONSTRAINT unique_bulk_normalized_domain 
UNIQUE (client_id, normalized_domain); -- Unique per client

-- Step 6: Add triggers for auto-normalization
CREATE OR REPLACE FUNCTION trigger_normalize_domain()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_domain := normalize_domain(NEW.domain);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Websites trigger
DROP TRIGGER IF EXISTS normalize_website_domain_trigger ON websites;
CREATE TRIGGER normalize_website_domain_trigger
BEFORE INSERT OR UPDATE OF domain ON websites
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_domain();

-- Bulk analysis trigger
DROP TRIGGER IF EXISTS normalize_bulk_domain_trigger ON bulk_analysis_domains;
CREATE TRIGGER normalize_bulk_domain_trigger
BEFORE INSERT OR UPDATE OF domain ON bulk_analysis_domains
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_domain();

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_websites_normalized_domain 
ON websites(normalized_domain);

CREATE INDEX IF NOT EXISTS idx_bulk_normalized_domain 
ON bulk_analysis_domains(normalized_domain);

-- Step 8: Add check constraints for domain format validation
ALTER TABLE websites
DROP CONSTRAINT IF EXISTS check_valid_domain;

ALTER TABLE websites
ADD CONSTRAINT check_valid_domain
CHECK (domain ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');

-- Step 9: Create helper function for domain lookups
CREATE OR REPLACE FUNCTION find_website_by_domain(input_domain TEXT)
RETURNS SETOF websites AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM websites 
    WHERE normalized_domain = normalize_domain(input_domain);
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create view for easy domain management
CREATE OR REPLACE VIEW domain_management AS
SELECT 
    w.id,
    w.domain as original_domain,
    w.normalized_domain,
    w.domain_rating,
    w.total_traffic,
    COUNT(DISTINCT por.publisher_id) as publisher_count,
    w.quality_verified,
    w.created_at
FROM websites w
LEFT JOIN publisher_offering_relationships por ON por.website_id = w.id
GROUP BY w.id;

-- Success!
DO $$
BEGIN
    RAISE NOTICE '✅ Clean domain setup complete!';
    RAISE NOTICE 'All new domains will be automatically normalized.';
    RAISE NOTICE 'Use find_website_by_domain() for lookups.';
    RAISE NOTICE 'No duplicates possible with unique constraints.';
END $$;