-- Shadow Publisher System - Missing Tables and Columns
-- This migration creates the infrastructure needed for the shadow publisher system

-- Create shadow_publisher_websites table
CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
    id VARCHAR(36) PRIMARY KEY,
    publisher_id VARCHAR(36) NOT NULL REFERENCES publishers(id),
    website_id VARCHAR(36) NOT NULL REFERENCES websites(id),
    confidence VARCHAR(10) NOT NULL,
    source VARCHAR(50) DEFAULT 'email_extraction',
    extraction_method VARCHAR(50) DEFAULT 'ai_extracted',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(publisher_id, website_id)
);

-- Add indexes for shadow_publisher_websites
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_publisher ON shadow_publisher_websites(publisher_id);
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_website ON shadow_publisher_websites(website_id);
CREATE INDEX IF NOT EXISTS idx_shadow_publisher_websites_verified ON shadow_publisher_websites(verified);

-- Add missing columns to publisher_websites (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_edit_pricing') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_edit_pricing BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_edit_availability') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_edit_availability BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_websites' AND column_name='can_view_analytics') THEN
        ALTER TABLE publisher_websites ADD COLUMN can_view_analytics BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add missing columns to publisher_offerings (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_available') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_available BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_price') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='publisher_offerings' AND column_name='express_days') THEN
        ALTER TABLE publisher_offerings ADD COLUMN express_days INTEGER;
    END IF;
END $$;

-- Add missing columns to email_processing_logs (if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_processing_logs' AND column_name='sender_email') THEN
        ALTER TABLE email_processing_logs ADD COLUMN sender_email VARCHAR(255);
    END IF;
END $$;

-- Update timestamps trigger for shadow_publisher_websites
CREATE OR REPLACE FUNCTION update_shadow_publisher_websites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shadow_publisher_websites_update_timestamp
    BEFORE UPDATE ON shadow_publisher_websites
    FOR EACH ROW
    EXECUTE FUNCTION update_shadow_publisher_websites_timestamp();