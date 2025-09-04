-- Migration: Add niche tracking fields
-- Description: Track when websites were last analyzed for niches and store suggested new niches
-- Date: 2025-09-04

-- Add last_niche_check to websites table
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

-- Add comment for documentation
COMMENT ON COLUMN websites.last_niche_check IS 'Timestamp of last AI niche analysis';
COMMENT ON COLUMN websites.suggested_niches IS 'AI-suggested niches not in current list';
COMMENT ON COLUMN websites.suggested_categories IS 'AI-suggested categories not in current list';
COMMENT ON COLUMN websites.niche_confidence IS 'AI confidence score for niche assignment (0-1)';