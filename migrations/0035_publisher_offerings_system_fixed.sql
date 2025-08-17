-- Migration: Publisher Offerings System (Fixed Integration)
-- Description: Publisher management system that integrates with existing websites table
-- Author: System
-- Date: 2025-01-14
-- 
-- IMPORTANT: This migration creates supplementary tables that enhance the existing
-- websites table rather than replacing it. The websites table remains the central
-- source of truth during the transition period.

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Publisher Offering Relationships
-- Links publishers to websites they manage (renamed to avoid conflict)
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_offering_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Relationship Details
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'contact' 
    CHECK (relationship_type IN ('owner', 'editor', 'manager', 'broker', 'contact')),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'claimed'
    CHECK (verification_status IN ('verified', 'claimed', 'pending', 'disputed')),
  verification_method VARCHAR(50), -- dns, file_upload, email, manual
  verified_at TIMESTAMP,
  
  -- Priority and Status
  priority_rank INTEGER DEFAULT 100, -- Lower number = higher priority
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false, -- Preferred publisher for this website
  
  -- Contact Information (supplements websites table data)
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_name VARCHAR(255),
  
  -- Notes and Metadata
  internal_notes TEXT,
  publisher_notes TEXT, -- Publisher's own notes about this website
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure unique publisher-website combination
  UNIQUE(publisher_id, website_id)
);

-- Indexes for performance
CREATE INDEX idx_publisher_offering_rel_publisher ON publisher_offering_relationships(publisher_id);
CREATE INDEX idx_publisher_offering_rel_website ON publisher_offering_relationships(website_id);
CREATE INDEX idx_publisher_offering_rel_active ON publisher_offering_relationships(is_active) WHERE is_active = true;
CREATE INDEX idx_publisher_offering_rel_verification ON publisher_offering_relationships(verification_status);
CREATE INDEX idx_publisher_offering_rel_priority ON publisher_offering_relationships(website_id, priority_rank) WHERE is_active = true;

-- Add comment explaining relationship to existing tables
COMMENT ON TABLE publisher_offering_relationships IS 'Links publishers to websites they manage, supplementing the existing websites table data';

-- ============================================================================
-- STEP 2: Publisher Offerings (Product Catalog)
-- What publishers offer for each website (supplements websites.guestPostCost)
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_relationship_id UUID NOT NULL REFERENCES publisher_offering_relationships(id) ON DELETE CASCADE,
  
  -- Offering Details
  offering_type VARCHAR(50) NOT NULL 
    CHECK (offering_type IN (
      'guest_post', 
      'link_insertion', 
      'homepage_link', 
      'banner_ad', 
      'press_release',
      'sponsored_post',
      'niche_edit'
    )),
  offering_name VARCHAR(255), -- Custom name for the offering
  
  -- Pricing (supplements websites.guestPostCost during transition)
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  price_type VARCHAR(20) DEFAULT 'fixed' 
    CHECK (price_type IN ('fixed', 'starting_at', 'negotiable', 'contact')),
  
  -- Delivery Specifications
  turnaround_days INTEGER DEFAULT 7 CHECK (turnaround_days > 0),
  express_available BOOLEAN DEFAULT false,
  express_days INTEGER,
  express_price DECIMAL(10, 2),
  
  -- Link Specifications
  link_type VARCHAR(20) DEFAULT 'dofollow' 
    CHECK (link_type IN ('dofollow', 'nofollow', 'both', 'sponsored')),
  link_duration VARCHAR(20) DEFAULT 'permanent'
    CHECK (link_duration IN ('permanent', '12_months', '6_months', '3_months', 'custom')),
  max_links_per_post INTEGER DEFAULT 1,
  
  -- Flexible Attributes (JSONB for extensibility)
  attributes JSONB DEFAULT '{}',
  /* Example attributes structure (enforced at application layer):
  {
    "word_count": {"min": 500, "max": 2000},
    "allows_ai_content": false,
    "allows_promotional": true,
    "disclosure_type": "rel_sponsored",
    "includes_images": true,
    "includes_social_shares": false,
    "writer": "publisher_provides",
    "content_approval_required": true,
    "allows_revisions": 2,
    "allows_gray_niches": false,
    "prohibited_niches": ["adult", "gambling", "crypto"],
    "anchor_text_rules": "branded only",
    "geographic_restrictions": ["US", "UK", "CA"],
    "language": "en"
  }
  */
  
  -- Availability
  monthly_capacity INTEGER,
  current_availability VARCHAR(20) DEFAULT 'available'
    CHECK (current_availability IN ('available', 'limited', 'booked', 'paused')),
  next_available_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_order_at TIMESTAMP,
  
  -- Ensure unique offering per type per relationship
  UNIQUE(publisher_relationship_id, offering_type, offering_name)
);

-- Indexes for performance
CREATE INDEX idx_publisher_offerings_relationship ON publisher_offerings(publisher_relationship_id);
CREATE INDEX idx_publisher_offerings_type ON publisher_offerings(offering_type);
CREATE INDEX idx_publisher_offerings_active ON publisher_offerings(is_active) WHERE is_active = true;
CREATE INDEX idx_publisher_offerings_availability ON publisher_offerings(current_availability);
CREATE INDEX idx_publisher_offerings_price ON publisher_offerings(base_price);
CREATE INDEX idx_publisher_offerings_attributes ON publisher_offerings USING GIN (attributes);

-- Add comment explaining relationship to websites table
COMMENT ON TABLE publisher_offerings IS 'Publisher product catalog that supplements websites.guestPostCost with complex pricing options';

-- ============================================================================
-- STEP 3: Publisher Pricing Rules
-- Complex pricing rules (renamed to avoid conflict with order pricing_rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_offering_id UUID NOT NULL REFERENCES publisher_offerings(id) ON DELETE CASCADE,
  
  -- Rule Identification
  rule_type VARCHAR(50) NOT NULL 
    CHECK (rule_type IN (
      'niche_multiplier',
      'volume_discount', 
      'seasonal_pricing',
      'client_type_pricing',
      'urgency_pricing',
      'package_deal',
      'custom'
    )),
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Rule Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  /* Example conditions structure:
  {
    "niches": ["casino", "crypto", "cbd"],
    "min_quantity": 5,
    "max_quantity": 10,
    "client_type": ["agency", "direct"],
    "order_urgency": "express",
    "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
    "total_spend": {"min": 1000}
  }
  */
  
  -- Rule Actions (JSONB for flexibility)
  actions JSONB NOT NULL DEFAULT '{}',
  /* Example actions structure:
  {
    "price_multiplier": 1.5,
    "discount_percent": 20,
    "fixed_discount": 50,
    "add_fee": 100,
    "override_price": 250,
    "bonus_links": 1
  }
  */
  
  -- Rule Priority and Application
  priority INTEGER DEFAULT 100, -- Lower number = higher priority
  is_cumulative BOOLEAN DEFAULT false, -- Can stack with other rules
  auto_apply BOOLEAN DEFAULT true, -- Automatically apply when conditions met
  requires_approval BOOLEAN DEFAULT false, -- Needs manual approval
  
  -- Validity Period
  valid_from DATE,
  valid_until DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_publisher_pricing_rules_offering ON publisher_pricing_rules(publisher_offering_id);
CREATE INDEX idx_publisher_pricing_rules_type ON publisher_pricing_rules(rule_type);
CREATE INDEX idx_publisher_pricing_rules_active ON publisher_pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_publisher_pricing_rules_priority ON publisher_pricing_rules(priority);
CREATE INDEX idx_publisher_pricing_rules_conditions ON publisher_pricing_rules USING GIN (conditions);

-- Add comment explaining this is publisher-side pricing
COMMENT ON TABLE publisher_pricing_rules IS 'Publisher-side pricing rules, separate from client-side order pricing_rules';

-- ============================================================================
-- STEP 4: Publisher Performance Tracking
-- Supplements websites table performance metrics during transition
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Performance Metrics (will replace websites.avgResponseTimeHours, etc)
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  
  -- Response Metrics
  avg_response_time_hours DECIMAL(10, 2),
  avg_turnaround_days DECIMAL(10, 2),
  on_time_delivery_rate DECIMAL(5, 2), -- Percentage
  
  -- Quality Metrics
  content_approval_rate DECIMAL(5, 2), -- Percentage
  revision_rate DECIMAL(5, 2), -- Percentage
  client_satisfaction_score DECIMAL(3, 2), -- 1-5 scale
  
  -- Financial Metrics
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  avg_order_value DECIMAL(10, 2),
  
  -- Reliability Score (calculated)
  reliability_score DECIMAL(5, 2), -- 0-100 score
  last_calculated_at TIMESTAMP,
  
  -- Period for metrics
  period_start DATE,
  period_end DATE,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Unique per publisher or publisher-website combo
  UNIQUE(publisher_id, website_id)
);

-- Indexes for performance
CREATE INDEX idx_publisher_performance_publisher ON publisher_performance(publisher_id);
CREATE INDEX idx_publisher_performance_website ON publisher_performance(website_id);
CREATE INDEX idx_publisher_performance_reliability ON publisher_performance(reliability_score DESC);

-- Add comment explaining relationship to websites metrics
COMMENT ON TABLE publisher_performance IS 'Enhanced performance tracking that will eventually replace websites table metrics';

-- ============================================================================
-- STEP 5: Publisher Email Claim Mapping
-- Map publisher emails to potential website relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_email_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID REFERENCES publishers(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Claim Details
  claim_status VARCHAR(20) DEFAULT 'pending'
    CHECK (claim_status IN ('pending', 'approved', 'rejected', 'expired')),
  claim_confidence VARCHAR(20) DEFAULT 'low'
    CHECK (claim_confidence IN ('high', 'medium', 'low')),
  claim_source VARCHAR(50), -- email_match, domain_match, manual_entry
  
  -- Verification
  verification_token VARCHAR(255),
  verification_sent_at TIMESTAMP,
  verified_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  -- Prevent duplicate claims
  UNIQUE(publisher_id, email, website_id)
);

-- Indexes for performance
CREATE INDEX idx_publisher_email_claims_publisher ON publisher_email_claims(publisher_id);
CREATE INDEX idx_publisher_email_claims_email ON publisher_email_claims(email);
CREATE INDEX idx_publisher_email_claims_website ON publisher_email_claims(website_id);
CREATE INDEX idx_publisher_email_claims_status ON publisher_email_claims(claim_status);

-- ============================================================================
-- STEP 6: Create update triggers for timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_publisher_offering_rel_updated_at BEFORE UPDATE ON publisher_offering_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_offerings_updated_at BEFORE UPDATE ON publisher_offerings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_pricing_rules_updated_at BEFORE UPDATE ON publisher_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_performance_updated_at BEFORE UPDATE ON publisher_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Create helpful views for common queries
-- ============================================================================

-- View: Active publisher offerings with website details (joins with existing websites table)
CREATE OR REPLACE VIEW v_active_publisher_offerings AS
SELECT 
  po.*,
  por.publisher_id,
  por.website_id,
  por.relationship_type,
  por.verification_status,
  por.priority_rank,
  w.domain,
  w.domain_rating,
  w.total_traffic,
  w.categories,
  w.niche,
  -- Use new pricing if available, fall back to old
  COALESCE(po.base_price, w.guest_post_cost) as effective_price,
  p.email as publisher_email,
  p.company_name as publisher_company
FROM publisher_offerings po
JOIN publisher_offering_relationships por ON po.publisher_relationship_id = por.id
JOIN websites w ON por.website_id = w.id
JOIN publishers p ON por.publisher_id = p.id
WHERE po.is_active = true 
  AND por.is_active = true
  AND p.status = 'active';

-- View: Publisher performance with fallback to websites metrics
CREATE OR REPLACE VIEW v_publisher_performance_complete AS
SELECT 
  COALESCE(pp.publisher_id, p.id) as publisher_id,
  w.id as website_id,
  w.domain,
  -- Use new metrics if available, fall back to websites table
  COALESCE(pp.avg_response_time_hours, w.avg_response_time_hours::DECIMAL) as response_time,
  COALESCE(pp.on_time_delivery_rate, w.success_rate_percentage) as success_rate,
  COALESCE(pp.total_orders, w.total_posts_published) as total_orders,
  pp.reliability_score,
  pp.client_satisfaction_score
FROM websites w
LEFT JOIN publisher_offering_relationships por ON w.id = por.website_id
LEFT JOIN publishers p ON por.publisher_id = p.id
LEFT JOIN publisher_performance pp ON p.id = pp.publisher_id AND w.id = pp.website_id;

-- ============================================================================
-- STEP 8: Migration helper functions
-- ============================================================================

-- Function to migrate existing website pricing to new system
CREATE OR REPLACE FUNCTION migrate_website_pricing_to_offerings()
RETURNS void AS $$
DECLARE
  website_record RECORD;
  relationship_id UUID;
BEGIN
  -- This function helps migrate existing data but doesn't run automatically
  -- Run manually when ready: SELECT migrate_website_pricing_to_offerings();
  
  FOR website_record IN 
    SELECT w.*, pw.publisher_id 
    FROM websites w
    JOIN publisher_websites pw ON w.id = pw.website_id
    WHERE w.guest_post_cost IS NOT NULL
  LOOP
    -- Create relationship if doesn't exist
    INSERT INTO publisher_offering_relationships (
      publisher_id, website_id, relationship_type, verification_status
    ) VALUES (
      website_record.publisher_id, 
      website_record.id, 
      'contact', 
      'claimed'
    )
    ON CONFLICT (publisher_id, website_id) DO UPDATE
      SET updated_at = NOW()
    RETURNING id INTO relationship_id;
    
    -- Create offering from existing price
    INSERT INTO publisher_offerings (
      publisher_relationship_id,
      offering_type,
      base_price,
      turnaround_days,
      link_type,
      max_links_per_post
    ) VALUES (
      relationship_id,
      'guest_post',
      website_record.guest_post_cost,
      COALESCE(website_record.typical_turnaround_days, 7),
      CASE WHEN website_record.accepts_do_follow THEN 'dofollow' ELSE 'nofollow' END,
      COALESCE(website_record.max_links_per_post, 1)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_website_pricing_to_offerings() IS 'Helper function to migrate existing website pricing to new publisher offerings system';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Save separately as 0035_rollback.sql)
-- ============================================================================
/*
BEGIN TRANSACTION;

DROP VIEW IF EXISTS v_publisher_performance_complete;
DROP VIEW IF EXISTS v_active_publisher_offerings;

DROP FUNCTION IF EXISTS migrate_website_pricing_to_offerings();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS publisher_email_claims;
DROP TABLE IF EXISTS publisher_performance;
DROP TABLE IF EXISTS publisher_pricing_rules;
DROP TABLE IF EXISTS publisher_offerings;
DROP TABLE IF EXISTS publisher_offering_relationships;

COMMIT;
*/