-- Migration: Fix Publisher Portal Issues
-- Date: 2025-08-16
-- Description: Adds missing columns required for publisher portal functionality

-- 1. Add offering_name column to publisher_offerings table
-- This column is referenced in the publisher orders API
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS offering_name VARCHAR(255);

-- Update existing rows with a default offering name based on offering_type
UPDATE publisher_offerings 
SET offering_name = COALESCE(offering_name, 
  CASE 
    WHEN offering_type = 'guest_post' THEN 'Guest Post'
    WHEN offering_type = 'link_insertion' THEN 'Link Insertion'
    WHEN offering_type = 'content_creation' THEN 'Content Creation'
    ELSE offering_type
  END
)
WHERE offering_name IS NULL;

-- Note: The following issues were fixed in code only, no database changes needed:
-- - SQL FILTER syntax changed to CASE WHEN (PostgreSQL compatibility)
-- - Removed reference to non-existent earning_type column
-- - Added missing request parameter to API routes