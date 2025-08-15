-- Migration: Add missing columns to websites table
-- Date: 2025-02-14
-- Purpose: Add columns that the application expects but are missing from database

-- Check if columns already exist before adding them
DO $$ 
BEGIN
    -- Add publisher_tier column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'publisher_tier') THEN
        ALTER TABLE websites 
        ADD COLUMN publisher_tier VARCHAR(20) DEFAULT 'standard';
    END IF;

    -- Add preferred_content_types column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'preferred_content_types') THEN
        ALTER TABLE websites 
        ADD COLUMN preferred_content_types TEXT[];
    END IF;

    -- Add editorial_calendar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'editorial_calendar_url') THEN
        ALTER TABLE websites 
        ADD COLUMN editorial_calendar_url TEXT;
    END IF;

    -- Add content_guidelines_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'content_guidelines_url') THEN
        ALTER TABLE websites 
        ADD COLUMN content_guidelines_url TEXT;
    END IF;

    -- Add typical_turnaround_days column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'typical_turnaround_days') THEN
        ALTER TABLE websites 
        ADD COLUMN typical_turnaround_days INTEGER;
    END IF;

    -- Add accepts_do_follow column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'accepts_do_follow') THEN
        ALTER TABLE websites 
        ADD COLUMN accepts_do_follow BOOLEAN DEFAULT true;
    END IF;

    -- Add requires_author_bio column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'requires_author_bio') THEN
        ALTER TABLE websites 
        ADD COLUMN requires_author_bio BOOLEAN DEFAULT false;
    END IF;

    -- Add max_links_per_post column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'max_links_per_post') THEN
        ALTER TABLE websites 
        ADD COLUMN max_links_per_post INTEGER;
    END IF;

    -- Add primary_contact_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'primary_contact_id') THEN
        ALTER TABLE websites 
        ADD COLUMN primary_contact_id UUID;
    END IF;

    -- Add publisher_company column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'publisher_company') THEN
        ALTER TABLE websites 
        ADD COLUMN publisher_company VARCHAR(255);
    END IF;

    -- Add website_language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'website_language') THEN
        ALTER TABLE websites 
        ADD COLUMN website_language VARCHAR(10) DEFAULT 'en';
    END IF;

    -- Add target_audience column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'target_audience') THEN
        ALTER TABLE websites 
        ADD COLUMN target_audience TEXT;
    END IF;

    -- Add avg_response_time_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'avg_response_time_hours') THEN
        ALTER TABLE websites 
        ADD COLUMN avg_response_time_hours DECIMAL(10,2);
    END IF;

    -- Add success_rate_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'success_rate_percentage') THEN
        ALTER TABLE websites 
        ADD COLUMN success_rate_percentage DECIMAL(5,2);
    END IF;

    -- Add last_campaign_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'last_campaign_date') THEN
        ALTER TABLE websites 
        ADD COLUMN last_campaign_date DATE;
    END IF;

    -- Add total_posts_published column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'total_posts_published') THEN
        ALTER TABLE websites 
        ADD COLUMN total_posts_published INTEGER DEFAULT 0;
    END IF;

    -- Add internal_quality_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'internal_quality_score') THEN
        ALTER TABLE websites 
        ADD COLUMN internal_quality_score DECIMAL(3,2);
    END IF;

    -- Add internal_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'internal_notes') THEN
        ALTER TABLE websites 
        ADD COLUMN internal_notes TEXT;
    END IF;

    -- Add account_manager_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'account_manager_id') THEN
        ALTER TABLE websites 
        ADD COLUMN account_manager_id UUID;
    END IF;

    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'websites' 
                   AND column_name = 'organization_id') THEN
        ALTER TABLE websites 
        ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN websites.publisher_tier IS 'Publisher tier level: basic, standard, premium, enterprise';
COMMENT ON COLUMN websites.preferred_content_types IS 'Types of content this website prefers';
COMMENT ON COLUMN websites.editorial_calendar_url IS 'URL to editorial calendar if available';
COMMENT ON COLUMN websites.content_guidelines_url IS 'URL to content guidelines document';
COMMENT ON COLUMN websites.typical_turnaround_days IS 'Average days for content approval/publication';
COMMENT ON COLUMN websites.accepts_do_follow IS 'Whether website accepts do-follow links';
COMMENT ON COLUMN websites.requires_author_bio IS 'Whether author bio is required';
COMMENT ON COLUMN websites.max_links_per_post IS 'Maximum number of links allowed per post';
COMMENT ON COLUMN websites.primary_contact_id IS 'Primary contact person for this website';
COMMENT ON COLUMN websites.publisher_company IS 'Company that owns/manages this website';
COMMENT ON COLUMN websites.website_language IS 'Primary language of the website';
COMMENT ON COLUMN websites.target_audience IS 'Description of target audience';
COMMENT ON COLUMN websites.avg_response_time_hours IS 'Average response time in hours';
COMMENT ON COLUMN websites.success_rate_percentage IS 'Success rate for placements';
COMMENT ON COLUMN websites.last_campaign_date IS 'Date of last campaign with this website';
COMMENT ON COLUMN websites.total_posts_published IS 'Total number of posts published';
COMMENT ON COLUMN websites.internal_quality_score IS 'Internal quality rating (0-5)';
COMMENT ON COLUMN websites.internal_notes IS 'Internal notes about this website';
COMMENT ON COLUMN websites.account_manager_id IS 'Assigned account manager';
COMMENT ON COLUMN websites.organization_id IS 'Organization this website belongs to';