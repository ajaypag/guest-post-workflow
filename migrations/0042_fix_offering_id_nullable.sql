-- Migration: Make offering_id nullable in publisher_offering_relationships
-- Date: 2025-08-15
-- Reason: Publishers can have relationships with websites before creating offerings

-- Make offering_id nullable (it's currently NOT NULL)
ALTER TABLE publisher_offering_relationships 
ALTER COLUMN offering_id DROP NOT NULL;

-- Add comment explaining the nullable field
COMMENT ON COLUMN publisher_offering_relationships.offering_id IS 
'Reference to publisher_offerings.id - nullable to allow relationships before offerings are created';