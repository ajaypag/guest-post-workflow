-- NICHE FINDER SYSTEM - PRODUCTION MIGRATIONS
-- Run these migrations in order on production database
-- Date: 2025-09-04

-- ============================================
-- MIGRATION 1: Add website_type and niche columns to websites table (from 0023)
-- ============================================
ALTER TABLE websites ADD COLUMN IF NOT EXISTS website_type TEXT[];
ALTER TABLE websites ADD COLUMN IF NOT EXISTS niche TEXT[];
ALTER TABLE websites ADD COLUMN IF NOT EXISTS categories TEXT[];

-- Add indexes for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_websites_website_type ON websites USING GIN(website_type);
CREATE INDEX IF NOT EXISTS idx_websites_niche ON websites USING GIN(niche);
CREATE INDEX IF NOT EXISTS idx_websites_categories ON websites USING GIN(categories);

-- ============================================
-- MIGRATION 2: Add niche tracking fields (from 0082)
-- ============================================
-- Add tracking fields to websites table
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS last_niche_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS suggested_niches TEXT[],
ADD COLUMN IF NOT EXISTS suggested_categories TEXT[],
ADD COLUMN IF NOT EXISTS niche_confidence DECIMAL(3,2);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_websites_last_niche_check 
ON websites(last_niche_check);

-- Create a table to track suggested new niches/categories globally
CREATE TABLE IF NOT EXISTS suggested_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name VARCHAR(255) NOT NULL,
  tag_type VARCHAR(50) NOT NULL CHECK (tag_type IN ('niche', 'category', 'website_type')),
  website_count INTEGER DEFAULT 1,
  example_websites TEXT[],
  first_suggested_at TIMESTAMP DEFAULT NOW(),
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tag_name, tag_type)
);

-- Create indexes for suggested tags
CREATE INDEX IF NOT EXISTS idx_suggested_tags_type ON suggested_tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_suggested_tags_approved ON suggested_tags(approved);

-- Add comments for documentation
COMMENT ON COLUMN websites.last_niche_check IS 'Timestamp of last AI niche analysis';
COMMENT ON COLUMN websites.suggested_niches IS 'AI-suggested niches not in current list';
COMMENT ON COLUMN websites.suggested_categories IS 'AI-suggested categories not in current list';
COMMENT ON COLUMN websites.niche_confidence IS 'AI confidence score for niche assignment (0-1)';

-- ============================================
-- MIGRATION 3: Create niches master table (from 0102)
-- ============================================
-- Create niches table if it doesn't exist
CREATE TABLE IF NOT EXISTS niches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_niche_name UNIQUE (name)
);

-- Create case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_niches_name_lower ON niches (LOWER(name));

-- Populate niches table from existing website niches
INSERT INTO niches (name, source, created_at)
SELECT DISTINCT unnest(niche) AS name, 'imported' AS source, NOW() AS created_at
FROM websites
WHERE niche IS NOT NULL AND array_length(niche, 1) > 0
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE niches IS 'Master list of available niches for categorizing websites';

-- ============================================
-- VERIFICATION QUERIES (Run to confirm migrations)
-- ============================================
-- Check websites table columns:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'websites' 
-- AND column_name IN ('website_type', 'niche', 'categories', 'last_niche_check', 'suggested_niches', 'suggested_categories', 'niche_confidence');

-- Check suggested_tags table exists:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suggested_tags');

-- Check niches table exists:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'niches');

-- Count niches:
-- SELECT COUNT(DISTINCT name) FROM niches;