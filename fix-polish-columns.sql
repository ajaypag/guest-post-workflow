-- Fix for Polish sections database column size issues
-- This addresses the "Failed query: insert into polish_sections" error

-- Check current column sizes first
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'polish_sections' 
AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts')
ORDER BY column_name;

-- Fix polish_approach column (likely the main culprit)
-- Change from VARCHAR(100) to TEXT to handle any length AI content
ALTER TABLE polish_sections 
ALTER COLUMN polish_approach TYPE TEXT;

-- Ensure title column can handle long titles
ALTER TABLE polish_sections 
ALTER COLUMN title TYPE VARCHAR(500);

-- Make sure all text columns are TEXT type for AI content
ALTER TABLE polish_sections 
ALTER COLUMN strengths TYPE TEXT;

ALTER TABLE polish_sections 
ALTER COLUMN weaknesses TYPE TEXT;

ALTER TABLE polish_sections 
ALTER COLUMN brand_conflicts TYPE TEXT;

-- Verify the fixes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'polish_sections' 
AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts')
ORDER BY column_name;