-- Fix website source constraint to allow 'manyreach' for shadow publisher websites
-- This fixes the issue where ManyReach webhook-created websites fail due to constraint violation

DO $$ 
BEGIN 
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_website_source') THEN
        ALTER TABLE websites DROP CONSTRAINT check_website_source;
        RAISE NOTICE 'Dropped existing check_website_source constraint';
    END IF;
    
    -- Add updated constraint that includes 'manyreach'
    ALTER TABLE websites ADD CONSTRAINT check_website_source 
        CHECK (source IN ('airtable', 'publisher', 'internal', 'api', 'migration', 'manual', 'manyreach'));
    
    RAISE NOTICE 'Added updated check_website_source constraint with manyreach support';
END $$;