-- Migration: Add missing columns for publisher functionality
-- Date: 2025-02-14
-- Purpose: Add columns that the application code expects but were missing from initial migration

-- Add missing columns to publisher_offering_relationships
ALTER TABLE publisher_offering_relationships
ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(50) NOT NULL DEFAULT 'contact',
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'claimed',
ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_publisher_offering_rel_verification 
ON publisher_offering_relationships(verification_status);

CREATE INDEX IF NOT EXISTS idx_publisher_offering_rel_priority 
ON publisher_offering_relationships(website_id, priority_rank);

-- Add comments for documentation
COMMENT ON COLUMN publisher_offering_relationships.relationship_type IS 'Type of relationship: contact, owner, manager, etc.';
COMMENT ON COLUMN publisher_offering_relationships.verification_status IS 'Status: claimed, pending, verified, rejected';
COMMENT ON COLUMN publisher_offering_relationships.priority_rank IS 'Order priority for multiple publishers on same website (lower = higher priority)';
COMMENT ON COLUMN publisher_offering_relationships.is_preferred IS 'Whether this is the preferred publisher for the website';