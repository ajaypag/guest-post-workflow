-- Publisher CRM Enhancement - Add Missing Tables
-- This migration adds the remaining tables from GPT's proposed schema
-- to complete the publisher CRM system implementation

-- ============================================================================
-- ORGANIZATIONS TABLE
-- Manage publisher companies/organizations that own multiple websites
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Details
  name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500),
  description TEXT,
  industry VARCHAR(100),
  
  -- Contact Information
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),
  headquarters_address TEXT,
  headquarters_city VARCHAR(100),
  headquarters_country VARCHAR(100),
  
  -- Business Information
  company_size VARCHAR(50), -- startup, small, medium, large, enterprise
  annual_revenue_range VARCHAR(50), -- <1M, 1M-10M, 10M-100M, 100M+
  founding_year INTEGER CHECK (founding_year > 1900 AND founding_year <= EXTRACT(YEAR FROM NOW())),
  
  -- Relationship Management
  organization_type VARCHAR(50) DEFAULT 'publisher' CHECK (organization_type IN ('publisher', 'agency', 'network', 'individual')),
  tier VARCHAR(20) DEFAULT 'standard' CHECK (tier IN ('premium', 'standard', 'basic')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'prospect')),
  
  -- Internal Tracking
  account_manager_id UUID REFERENCES users(id),
  internal_notes TEXT,
  tags TEXT[], -- Flexible tagging system
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- CHANNELS TABLE
-- Track acquisition and communication channels for publisher relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Channel Information
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('direct', 'marketplace', 'agency', 'freelancer', 'referral', 'event', 'cold_outreach', 'inbound')),
  description TEXT,
  
  -- Channel Details (varies by type)
  platform_name VARCHAR(100), -- For marketplaces (e.g., "Collabor8", "HARO")
  contact_person VARCHAR(255), -- For agencies/freelancers
  contact_email VARCHAR(255),
  website_url VARCHAR(500),
  
  -- Performance Metrics
  success_rate DECIMAL(5,2) CHECK (success_rate >= 0 AND success_rate <= 100),
  average_response_time_hours INTEGER CHECK (average_response_time_hours >= 0),
  cost_per_acquisition DECIMAL(10,2) CHECK (cost_per_acquisition >= 0),
  
  -- Business Terms
  commission_rate DECIMAL(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100), -- For marketplaces
  payment_terms VARCHAR(50), -- net_30, prepaid, etc.
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- ============================================================================
-- CONTACT EMAILS TABLE
-- Support multiple email addresses per publisher contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  
  -- Email Details
  email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) DEFAULT 'work' CHECK (email_type IN ('work', 'personal', 'support', 'billing', 'editorial')),
  is_primary BOOLEAN DEFAULT false,
  
  -- Verification Status
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  bounce_status VARCHAR(20) DEFAULT 'none' CHECK (bounce_status IN ('none', 'soft', 'hard', 'complaint')),
  
  -- Usage Tracking
  last_used_at TIMESTAMP,
  successful_sends INTEGER DEFAULT 0,
  total_sends INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'bounced')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  
  -- Business Rules
  UNIQUE(contact_id, email),
  
  -- Ensure email format
  CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- OFFER SUMMARIES TABLE
-- Track different placement types and pricing offered by publishers
-- ============================================================================

CREATE TABLE IF NOT EXISTS offer_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES publisher_contacts(id) ON DELETE SET NULL,
  
  -- Placement Type
  placement_type VARCHAR(50) NOT NULL CHECK (placement_type IN ('guest_post', 'link_insert', 'sponsored_content', 'banner_ad', 'newsletter_mention', 'social_media')),
  
  -- Pricing Information
  base_price DECIMAL(10,2) CHECK (base_price >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  pricing_model VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'per_word', 'per_link', 'negotiable')),
  
  -- Service Details
  max_links_allowed INTEGER DEFAULT 1 CHECK (max_links_allowed >= 0),
  word_count_range VARCHAR(50), -- "500-800", "1000+", etc.
  turnaround_days INTEGER DEFAULT 7 CHECK (turnaround_days > 0),
  
  -- Link Attributes
  link_type VARCHAR(20) DEFAULT 'dofollow' CHECK (link_type IN ('dofollow', 'nofollow', 'mixed')),
  anchor_text_restrictions TEXT,
  
  -- Content Requirements
  content_requirements TEXT,
  prohibited_topics TEXT[],
  required_disclaimers TEXT,
  
  -- Terms
  payment_terms VARCHAR(50) DEFAULT 'prepaid' CHECK (payment_terms IN ('prepaid', 'net_15', 'net_30', 'net_60')),
  revision_policy TEXT,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  availability_notes TEXT,
  
  -- Quality Metrics
  average_da_increase DECIMAL(4,1) CHECK (average_da_increase >= 0),
  traffic_estimate INTEGER CHECK (traffic_estimate >= 0),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_updated_by UUID REFERENCES users(id),
  
  -- Business Rules
  UNIQUE(website_id, placement_type, contact_id)
);

-- ============================================================================
-- PRIMARY CONTACTS TABLE
-- Define primary contact per website per channel
-- ============================================================================

CREATE TABLE IF NOT EXISTS primary_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  
  -- Contact Role Context
  contact_role VARCHAR(50) NOT NULL CHECK (contact_role IN ('owner', 'editor', 'marketing_manager', 'content_manager', 'business_dev')),
  responsibilities TEXT[], -- ['pricing', 'content_approval', 'technical_integration']
  
  -- Communication Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'slack', 'linkedin')),
  preferred_contact_time VARCHAR(100), -- "9am-5pm EST", "weekdays only", etc.
  escalation_contact_id UUID REFERENCES publisher_contacts(id),
  
  -- Relationship Details
  relationship_strength VARCHAR(20) DEFAULT 'new' CHECK (relationship_strength IN ('strong', 'medium', 'new', 'strained')),
  established_date DATE,
  last_interaction_date DATE,
  
  -- Decision Making Authority
  can_approve_pricing BOOLEAN DEFAULT false,
  can_approve_content BOOLEAN DEFAULT false,
  approval_limit_usd DECIMAL(10,2) CHECK (approval_limit_usd >= 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'backup')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  
  -- Business Rules
  UNIQUE(website_id, channel_id), -- One primary contact per website per channel
  
  -- Ensure contact is associated with the website
  CONSTRAINT check_contact_website_association CHECK (
    EXISTS (
      SELECT 1 FROM contact_website_associations 
      WHERE contact_id = primary_contacts.contact_id 
      AND website_id = primary_contacts.website_id 
      AND status = 'active'
    )
  )
);

-- ============================================================================
-- UPDATE EXISTING TABLES
-- Add organization relationships and missing indexes
-- ============================================================================

-- Add organization reference to websites
ALTER TABLE websites ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add channel reference to contact_website_associations
ALTER TABLE contact_website_associations ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id);

-- Add organization reference to publisher_contacts
ALTER TABLE publisher_contacts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimize query performance for new tables
-- ============================================================================

-- Organizations Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_account_manager ON organizations(account_manager_id) WHERE account_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(tier);

-- Channels Indexes
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_platform ON channels(platform_name) WHERE platform_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channels_performance ON channels(success_rate) WHERE success_rate IS NOT NULL;

-- Contact Emails Indexes
CREATE INDEX IF NOT EXISTS idx_contact_emails_contact ON contact_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_emails_email ON contact_emails(email);
CREATE INDEX IF NOT EXISTS idx_contact_emails_primary ON contact_emails(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_contact_emails_type ON contact_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_contact_emails_status ON contact_emails(status);

-- Offer Summaries Indexes
CREATE INDEX IF NOT EXISTS idx_offer_summaries_website ON offer_summaries(website_id);
CREATE INDEX IF NOT EXISTS idx_offer_summaries_contact ON offer_summaries(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_summaries_placement_type ON offer_summaries(placement_type);
CREATE INDEX IF NOT EXISTS idx_offer_summaries_available ON offer_summaries(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_offer_summaries_pricing ON offer_summaries(base_price) WHERE base_price IS NOT NULL;

-- Primary Contacts Indexes
CREATE INDEX IF NOT EXISTS idx_primary_contacts_website ON primary_contacts(website_id);
CREATE INDEX IF NOT EXISTS idx_primary_contacts_contact ON primary_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_primary_contacts_channel ON primary_contacts(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_primary_contacts_role ON primary_contacts(contact_role);
CREATE INDEX IF NOT EXISTS idx_primary_contacts_status ON primary_contacts(status);

-- New Relationship Indexes
CREATE INDEX IF NOT EXISTS idx_websites_organization ON websites(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_associations_channel ON contact_website_associations(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_organization ON publisher_contacts(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- DATABASE TRIGGERS
-- Maintain data consistency for new tables
-- ============================================================================

-- Update timestamp triggers for new tables
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at 
    BEFORE UPDATE ON channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_emails_updated_at 
    BEFORE UPDATE ON contact_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_summaries_updated_at 
    BEFORE UPDATE ON offer_summaries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_primary_contacts_updated_at 
    BEFORE UPDATE ON primary_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic trigger: ensure only one primary email per contact
CREATE OR REPLACE FUNCTION ensure_single_primary_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE contact_emails 
        SET is_primary = false 
        WHERE contact_id = NEW.contact_id 
          AND id != NEW.id 
          AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_email_trigger
    BEFORE INSERT OR UPDATE ON contact_emails
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_email();

-- ============================================================================
-- SEED DATA
-- Add initial channels and common organization types
-- ============================================================================

-- Insert common channels
INSERT INTO channels (name, type, description) VALUES
  ('Direct Outreach', 'direct', 'Direct email outreach to publishers'),
  ('Collabor8', 'marketplace', 'Collabor8 marketplace platform'),
  ('HARO', 'marketplace', 'Help a Reporter Out platform'),
  ('LinkedIn Connections', 'direct', 'Publisher connections via LinkedIn'),
  ('Referral Network', 'referral', 'Publishers referred by existing contacts'),
  ('Industry Events', 'event', 'Connections made at conferences and meetups'),
  ('Cold Email', 'cold_outreach', 'Initial cold email campaigns'),
  ('Website Contact Form', 'inbound', 'Publishers who contacted us first')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DATA VALIDATION
-- Add constraints and checks for data integrity
-- ============================================================================

-- Ensure organizations have valid contact information
ALTER TABLE organizations ADD CONSTRAINT check_primary_email_format 
    CHECK (primary_email IS NULL OR primary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure primary contacts are properly linked
CREATE OR REPLACE FUNCTION validate_primary_contact_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure the contact is actually associated with the website
    IF NOT EXISTS (
        SELECT 1 FROM contact_website_associations 
        WHERE contact_id = NEW.contact_id 
        AND website_id = NEW.website_id 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Contact % is not associated with website %', NEW.contact_id, NEW.website_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_primary_contact_relationship_trigger
    BEFORE INSERT OR UPDATE ON primary_contacts
    FOR EACH ROW
    EXECUTE FUNCTION validate_primary_contact_relationship();

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- Add table and column comments for clarity
-- ============================================================================

COMMENT ON TABLE organizations IS 'Publisher companies/organizations that own multiple websites';
COMMENT ON TABLE channels IS 'Acquisition and communication channels for publisher relationships';
COMMENT ON TABLE contact_emails IS 'Multiple email addresses per publisher contact with verification status';
COMMENT ON TABLE offer_summaries IS 'Different placement types and pricing offered by publishers per website';
COMMENT ON TABLE primary_contacts IS 'Primary contact designation per website per channel for streamlined communication';

-- Column comments for key fields
COMMENT ON COLUMN organizations.tier IS 'Publisher tier: premium (high-value), standard (regular), basic (low-value)';
COMMENT ON COLUMN channels.type IS 'Channel type: direct, marketplace, agency, freelancer, referral, event, cold_outreach, inbound';
COMMENT ON COLUMN offer_summaries.placement_type IS 'Type of content placement: guest_post, link_insert, sponsored_content, banner_ad, newsletter_mention, social_media';
COMMENT ON COLUMN primary_contacts.contact_role IS 'Primary role: owner, editor, marketing_manager, content_manager, business_dev';

-- ============================================================================
-- MIGRATION LOGGING
-- Record the successful migration
-- ============================================================================

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '0032_add_missing_crm_tables', 
    NOW(), 
    'Added missing CRM tables from GPT schema: organizations, channels, contact_emails, offer_summaries, primary_contacts. Enhanced existing tables with organization relationships.'
) ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- Publisher CRM system now fully implements GPT's proposed schema
-- ============================================================================

-- Final status message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION 0032 COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Added 5 missing CRM tables to complete publisher management system:';
    RAISE NOTICE '• organizations - Publisher company/organization management';
    RAISE NOTICE '• channels - Acquisition and communication channel tracking';
    RAISE NOTICE '• contact_emails - Multiple emails per contact with verification';
    RAISE NOTICE '• offer_summaries - Placement types and pricing per website';
    RAISE NOTICE '• primary_contacts - Primary contact per website per channel';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Enhanced existing tables with organization relationships';
    RAISE NOTICE 'Added comprehensive indexes and business logic triggers';
    RAISE NOTICE 'Seeded common channels for immediate use';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Create publisherCrmSchema.ts Drizzle schema file';
    RAISE NOTICE '2. Update existing schema relations';
    RAISE NOTICE '3. Run QA validation and performance testing';
    RAISE NOTICE '4. Build publisher portal interfaces';
    RAISE NOTICE '============================================================================';
END $$;