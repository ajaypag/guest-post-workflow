-- Migration: Add missing columns for publisher functionality
-- Date: 2025-02-14
-- Purpose: Add columns that the application code expects but were missing from initial migration
-- IMPORTANT: This migration is required after 0035_publisher_offerings_system_fixed_v2.sql

-- Check if columns already exist before adding them
DO $$ 
BEGIN
    -- Add relationship_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'publisher_offering_relationships' 
                   AND column_name = 'relationship_type') THEN
        ALTER TABLE publisher_offering_relationships 
        ADD COLUMN relationship_type VARCHAR(50) NOT NULL DEFAULT 'contact';
    END IF;

    -- Add verification_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'publisher_offering_relationships' 
                   AND column_name = 'verification_status') THEN
        ALTER TABLE publisher_offering_relationships 
        ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'claimed';
    END IF;

    -- Add priority_rank column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'publisher_offering_relationships' 
                   AND column_name = 'priority_rank') THEN
        ALTER TABLE publisher_offering_relationships 
        ADD COLUMN priority_rank INTEGER DEFAULT 100;
    END IF;

    -- Add is_preferred column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'publisher_offering_relationships' 
                   AND column_name = 'is_preferred') THEN
        ALTER TABLE publisher_offering_relationships 
        ADD COLUMN is_preferred BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_publisher_offering_rel_verification 
ON publisher_offering_relationships(verification_status);

CREATE INDEX IF NOT EXISTS idx_publisher_offering_rel_priority 
ON publisher_offering_relationships(website_id, priority_rank);

-- Add comments for documentation
COMMENT ON COLUMN publisher_offering_relationships.relationship_type IS 'Type of relationship: contact, owner, manager, editor, broker';
COMMENT ON COLUMN publisher_offering_relationships.verification_status IS 'Status: claimed, pending, verified, rejected';
COMMENT ON COLUMN publisher_offering_relationships.priority_rank IS 'Order priority for multiple publishers on same website (lower = higher priority)';
COMMENT ON COLUMN publisher_offering_relationships.is_preferred IS 'Whether this is the preferred publisher for the website';

-- Verify the migration was successful
DO $$
DECLARE
    missing_columns TEXT := '';
    col_count INTEGER;
BEGIN
    -- Check all required columns exist
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'publisher_offering_relationships' 
    AND column_name IN ('relationship_type', 'verification_status', 'priority_rank', 'is_preferred');
    
    IF col_count < 4 THEN
        RAISE EXCEPTION 'Migration failed: Not all required columns were added to publisher_offering_relationships';
    END IF;
    
    RAISE NOTICE 'Migration successful: All 4 new columns added to publisher_offering_relationships';
END $$;