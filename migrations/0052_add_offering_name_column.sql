-- Migration: Add offering_name column to publisher_offerings
-- Purpose: Fix missing column that's referenced in the code
-- Date: 2025-08-16

-- Add the offering_name column if it doesn't exist
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS offering_name VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN publisher_offerings.offering_name IS 'Custom name for the offering';