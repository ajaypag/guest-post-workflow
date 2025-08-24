-- Migration: Fix Multiple Offerings Per Website
-- Date: 2025-08-18
-- Description: Allow publishers to have multiple offerings for the same website
-- 
-- Problem: Current unique constraint (publisher_id, website_id) prevents publishers
-- from having multiple offerings for the same website. This is too restrictive.
-- 
-- Solution: Change the constraint to (publisher_id, website_id, offering_id) 
-- which allows multiple offerings per website but prevents duplicate relationships
-- for the same offering.

BEGIN;

-- First, remove the existing constraint
ALTER TABLE publisher_offering_relationships 
DROP CONSTRAINT IF EXISTS publisher_offering_relationships_publisher_id_website_id_key;

-- Add a new constraint that allows multiple offerings per website
-- but prevents duplicates of the same offering
ALTER TABLE publisher_offering_relationships 
ADD CONSTRAINT publisher_offering_relationships_unique_offering 
UNIQUE (publisher_id, website_id, offering_id);

-- Add a comment explaining the new constraint
COMMENT ON CONSTRAINT publisher_offering_relationships_unique_offering 
ON publisher_offering_relationships IS 
'Allows multiple offerings per publisher-website pair, but prevents duplicate offering relationships';

COMMIT;