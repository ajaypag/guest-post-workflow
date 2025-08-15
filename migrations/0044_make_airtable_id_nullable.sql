-- Migration: Make airtable_id nullable to allow manual website creation
-- Date: 2025-08-15
-- Purpose: Unblock publishers and internal team from adding websites without Airtable

-- Step 1: Make airtable_id nullable
ALTER TABLE websites 
ALTER COLUMN airtable_id DROP NOT NULL;

-- Step 2: Add source tracking columns
ALTER TABLE websites
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'airtable',
ADD COLUMN IF NOT EXISTS added_by_publisher_id UUID REFERENCES publishers(id),
ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(100);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN websites.source IS 'Source of website data: airtable, publisher, internal, api';
COMMENT ON COLUMN websites.added_by_publisher_id IS 'Publisher who added this website (if source=publisher)';
COMMENT ON COLUMN websites.added_by_user_id IS 'Internal user who added this website (if source=internal)';
COMMENT ON COLUMN websites.source_metadata IS 'Additional metadata about the source (import details, API info, etc)';
COMMENT ON COLUMN websites.import_batch_id IS 'Batch identifier for bulk imports';

-- Step 4: Update existing records to have proper source
UPDATE websites 
SET source = 'airtable' 
WHERE airtable_id IS NOT NULL AND source IS NULL;

-- Step 5: Create index for source tracking
CREATE INDEX IF NOT EXISTS idx_websites_source ON websites(source);
CREATE INDEX IF NOT EXISTS idx_websites_added_by_publisher ON websites(added_by_publisher_id) WHERE added_by_publisher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websites_added_by_user ON websites(added_by_user_id) WHERE added_by_user_id IS NOT NULL;

-- Step 6: Add check constraint for source values
ALTER TABLE websites
ADD CONSTRAINT check_website_source 
CHECK (source IN ('airtable', 'publisher', 'internal', 'api', 'migration', 'manual'));

-- Step 7: Create a function to generate placeholder airtable_id for non-Airtable sources
CREATE OR REPLACE FUNCTION generate_placeholder_airtable_id(source_type VARCHAR, entity_id UUID)
RETURNS VARCHAR AS $$
BEGIN
    -- Generate a unique placeholder ID that won't conflict with real Airtable IDs
    -- Format: SOURCE_TIMESTAMP_SHORTID
    RETURN UPPER(source_type || '_' || 
                 TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '_' || 
                 SUBSTRING(entity_id::TEXT, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add trigger to auto-generate placeholder airtable_id if needed (optional)
-- Commented out by default - uncomment if you want auto-generation
/*
CREATE OR REPLACE FUNCTION trigger_generate_airtable_placeholder()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.airtable_id IS NULL AND NEW.source != 'airtable' THEN
        NEW.airtable_id = generate_placeholder_airtable_id(
            NEW.source, 
            COALESCE(NEW.added_by_publisher_id, NEW.added_by_user_id, gen_random_uuid())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_airtable_placeholder
BEFORE INSERT ON websites
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_airtable_placeholder();
*/

-- Step 9: Log migration
INSERT INTO schema_migrations (version, name, executed_at)
VALUES ('0044', 'make_airtable_id_nullable', NOW())
ON CONFLICT (version) DO NOTHING;

-- Step 10: Verify migration
DO $$
DECLARE
    is_nullable BOOLEAN;
BEGIN
    SELECT is_nullable = 'YES' INTO is_nullable
    FROM information_schema.columns
    WHERE table_name = 'websites' 
    AND column_name = 'airtable_id';
    
    IF is_nullable THEN
        RAISE NOTICE '✅ Migration successful: airtable_id is now nullable';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: airtable_id is still NOT NULL';
    END IF;
END $$;