-- Publisher CRM System - Clean Slate Implementation
-- This migration creates the new publisher contact management system
-- while preserving the existing websites table structure

-- ============================================================================
-- PUBLISHER CONTACTS TABLE
-- Core table for managing publisher contact information
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  
  -- Professional Information  
  job_title VARCHAR(100),
  company VARCHAR(255),
  linkedin_url VARCHAR(500),
  
  -- Contact Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'linkedin')),
  timezone VARCHAR(50),
  communication_notes TEXT,
  
  -- Relationship Data
  relationship_status VARCHAR(20) DEFAULT 'prospect' CHECK (relationship_status IN ('prospect', 'active', 'inactive', 'blocked')),
  acquisition_channel VARCHAR(50),
  first_contact_date DATE,
  last_contact_date DATE,
  
  -- Internal Tracking
  internal_notes TEXT,
  assigned_account_manager UUID REFERENCES users(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- CONTACT WEBSITE ASSOCIATIONS TABLE
-- Links publisher contacts to websites with role and service information
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_website_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Association Details
  role VARCHAR(50) NOT NULL, -- owner, editor, contact_person, decision_maker, etc.
  is_primary_contact BOOLEAN DEFAULT false,
  permissions TEXT[], -- pricing, content, technical, etc.
  
  -- Service Information
  offers_guest_posts BOOLEAN DEFAULT false,
  offers_link_inserts BOOLEAN DEFAULT false,
  guest_post_price DECIMAL(10,2),
  link_insert_price DECIMAL(10,2),
  minimum_turnaround_days INTEGER,
  
  -- Terms & Conditions
  payment_terms VARCHAR(50), -- net_30, prepaid, etc.
  content_requirements TEXT,
  link_requirements TEXT,
  
  -- Status Tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  relationship_start_date DATE,
  relationship_end_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  
  -- Business Rules
  UNIQUE(contact_id, website_id, role),
  
  -- Ensure primary contact consistency
  CONSTRAINT check_primary_contact_active CHECK (
    NOT is_primary_contact OR status = 'active'
  )
);

-- ============================================================================
-- PUBLISHER ACCOUNTS TABLE
-- Authentication and access management for publisher portal
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Email Verification
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  
  -- Password Reset
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  
  -- Security
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Business Rules
  CONSTRAINT check_email_match CHECK (email = (
    SELECT email FROM publisher_contacts WHERE id = contact_id
  )),
  
  CONSTRAINT check_login_attempts CHECK (login_attempts >= 0 AND login_attempts <= 10)
);

-- ============================================================================
-- ENHANCE EXISTING WEBSITES TABLE
-- Add new columns to support enhanced publisher relationship management
-- ============================================================================

-- Enhanced Publisher Information
ALTER TABLE websites ADD COLUMN IF NOT EXISTS publisher_tier VARCHAR(20) DEFAULT 'standard' CHECK (publisher_tier IN ('premium', 'standard', 'basic'));
ALTER TABLE websites ADD COLUMN IF NOT EXISTS preferred_content_types TEXT[];
ALTER TABLE websites ADD COLUMN IF NOT EXISTS editorial_calendar_url VARCHAR(500);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS content_guidelines_url VARCHAR(500);

-- Publishing Details
ALTER TABLE websites ADD COLUMN IF NOT EXISTS typical_turnaround_days INTEGER DEFAULT 7 CHECK (typical_turnaround_days > 0);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS accepts_do_follow BOOLEAN DEFAULT true;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS requires_author_bio BOOLEAN DEFAULT false;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS max_links_per_post INTEGER DEFAULT 2 CHECK (max_links_per_post >= 0);

-- Business Information
ALTER TABLE websites ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES publisher_contacts(id);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS publisher_company VARCHAR(255);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS website_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Performance Tracking
ALTER TABLE websites ADD COLUMN IF NOT EXISTS avg_response_time_hours INTEGER CHECK (avg_response_time_hours >= 0);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS success_rate_percentage DECIMAL(5,2) CHECK (success_rate_percentage >= 0 AND success_rate_percentage <= 100);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS last_campaign_date DATE;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS total_posts_published INTEGER DEFAULT 0 CHECK (total_posts_published >= 0);

-- Internal Classification
ALTER TABLE websites ADD COLUMN IF NOT EXISTS internal_quality_score INTEGER CHECK (internal_quality_score >= 1 AND internal_quality_score <= 10);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimize query performance for common access patterns
-- ============================================================================

-- Publisher Contacts Indexes
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_email ON publisher_contacts(email);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_status ON publisher_contacts(relationship_status);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_account_manager ON publisher_contacts(assigned_account_manager);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_name ON publisher_contacts(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_company ON publisher_contacts(company);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_created_at ON publisher_contacts(created_at);

-- Contact Website Associations Indexes
CREATE INDEX IF NOT EXISTS idx_contact_associations_contact ON contact_website_associations(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_associations_website ON contact_website_associations(website_id);
CREATE INDEX IF NOT EXISTS idx_contact_associations_status ON contact_website_associations(status);
CREATE INDEX IF NOT EXISTS idx_contact_associations_role ON contact_website_associations(role);
CREATE INDEX IF NOT EXISTS idx_contact_associations_primary ON contact_website_associations(is_primary_contact) WHERE is_primary_contact = true;
CREATE INDEX IF NOT EXISTS idx_contact_associations_offers_posts ON contact_website_associations(offers_guest_posts) WHERE offers_guest_posts = true;

-- Publisher Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_publisher_accounts_email ON publisher_accounts(email);
CREATE INDEX IF NOT EXISTS idx_publisher_accounts_contact ON publisher_accounts(contact_id);
CREATE INDEX IF NOT EXISTS idx_publisher_accounts_verified ON publisher_accounts(email_verified);
CREATE INDEX IF NOT EXISTS idx_publisher_accounts_reset_token ON publisher_accounts(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Enhanced Websites Indexes
CREATE INDEX IF NOT EXISTS idx_websites_primary_contact ON websites(primary_contact_id) WHERE primary_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websites_account_manager ON websites(account_manager_id) WHERE account_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websites_publisher_tier ON websites(publisher_tier);
CREATE INDEX IF NOT EXISTS idx_websites_quality_score ON websites(internal_quality_score) WHERE internal_quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websites_language ON websites(website_language);
CREATE INDEX IF NOT EXISTS idx_websites_last_campaign ON websites(last_campaign_date) WHERE last_campaign_date IS NOT NULL;

-- ============================================================================
-- DATABASE TRIGGERS
-- Automatic maintenance of data consistency and timestamps
-- ============================================================================

-- Update timestamp trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_publisher_contacts_updated_at 
    BEFORE UPDATE ON publisher_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_associations_updated_at 
    BEFORE UPDATE ON contact_website_associations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_accounts_updated_at 
    BEFORE UPDATE ON publisher_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- Helper functions for common business operations
-- ============================================================================

-- Function to ensure only one primary contact per website
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a primary contact, unset any existing primary contacts for this website
    IF NEW.is_primary_contact = true THEN
        UPDATE contact_website_associations 
        SET is_primary_contact = false 
        WHERE website_id = NEW.website_id 
          AND id != NEW.id 
          AND is_primary_contact = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_contact_trigger
    BEFORE INSERT OR UPDATE ON contact_website_associations
    FOR EACH ROW
    WHEN (NEW.is_primary_contact = true)
    EXECUTE FUNCTION ensure_single_primary_contact();

-- Function to update website primary_contact_id when association changes
CREATE OR REPLACE FUNCTION sync_website_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.is_primary_contact = true THEN
            UPDATE websites 
            SET primary_contact_id = NEW.contact_id 
            WHERE id = NEW.website_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operations
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_primary_contact = true THEN
            UPDATE websites 
            SET primary_contact_id = NULL 
            WHERE id = OLD.website_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_website_primary_contact_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contact_website_associations
    FOR EACH ROW
    EXECUTE FUNCTION sync_website_primary_contact();

-- ============================================================================
-- DATA VALIDATION
-- Ensure data integrity and business rule compliance
-- ============================================================================

-- Validate email format in publisher_contacts
ALTER TABLE publisher_contacts ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validate URL formats
ALTER TABLE publisher_contacts ADD CONSTRAINT check_linkedin_url 
    CHECK (linkedin_url IS NULL OR linkedin_url ~* '^https?://.*linkedin\.com/');

ALTER TABLE websites ADD CONSTRAINT check_editorial_calendar_url 
    CHECK (editorial_calendar_url IS NULL OR editorial_calendar_url ~* '^https?://');

ALTER TABLE websites ADD CONSTRAINT check_content_guidelines_url 
    CHECK (content_guidelines_url IS NULL OR content_guidelines_url ~* '^https?://');

-- Ensure pricing is positive
ALTER TABLE contact_website_associations ADD CONSTRAINT check_positive_prices 
    CHECK (
        (guest_post_price IS NULL OR guest_post_price >= 0) AND
        (link_insert_price IS NULL OR link_insert_price >= 0)
    );

-- Ensure relationship dates are logical
ALTER TABLE contact_website_associations ADD CONSTRAINT check_relationship_dates 
    CHECK (
        relationship_end_date IS NULL OR 
        relationship_start_date IS NULL OR 
        relationship_end_date >= relationship_start_date
    );

ALTER TABLE publisher_contacts ADD CONSTRAINT check_contact_dates 
    CHECK (
        first_contact_date IS NULL OR 
        last_contact_date IS NULL OR 
        last_contact_date >= first_contact_date
    );

-- ============================================================================
-- INITIAL DATA SETUP
-- Set up any required initial data or defaults
-- ============================================================================

-- Create a comment to document this migration
COMMENT ON TABLE publisher_contacts IS 'Publisher contact management - person-centric approach for managing publisher relationships across multiple websites';
COMMENT ON TABLE contact_website_associations IS 'Links publisher contacts to websites with role and service information - supports many-to-many relationships';
COMMENT ON TABLE publisher_accounts IS 'Authentication and portal access for publishers - separate from internal user accounts';

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '0020_publisher_crm_clean_slate', 
    NOW(), 
    'Created publisher CRM system with clean slate approach - publisher contacts, associations, accounts, and enhanced website fields'
) ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- New publisher CRM system ready for use
-- ============================================================================