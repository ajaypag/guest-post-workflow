-- Migration: Publisher Offerings System
-- Description: Comprehensive publisher management system for guest posts and link building
-- Author: System
-- Date: 2025-01-13

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Publisher Website Relationships
-- Core relationship between publishers and websites they manage
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_websites (
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
  
  -- Contact Information
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
CREATE INDEX idx_publisher_websites_publisher ON publisher_websites(publisher_id);
CREATE INDEX idx_publisher_websites_website ON publisher_websites(website_id);
CREATE INDEX idx_publisher_websites_active ON publisher_websites(is_active) WHERE is_active = true;
CREATE INDEX idx_publisher_websites_verification ON publisher_websites(verification_status);
CREATE INDEX idx_publisher_websites_priority ON publisher_websites(website_id, priority_rank) WHERE is_active = true;

-- ============================================================================
-- STEP 2: Publisher Offerings (Product Catalog)
-- What publishers offer for each website they manage
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_website_id UUID NOT NULL REFERENCES publisher_websites(id) ON DELETE CASCADE,
  
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
  
  -- Pricing
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
  /* Example attributes:
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
    "language": "en",
    "seo_metrics_required": {"da": 30, "dr": 40, "traffic": 5000}
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
  
  -- Ensure unique offering per type per publisher-website
  UNIQUE(publisher_website_id, offering_type, offering_name)
);

-- Indexes for performance
CREATE INDEX idx_publisher_offerings_publisher_website ON publisher_offerings(publisher_website_id);
CREATE INDEX idx_publisher_offerings_type ON publisher_offerings(offering_type);
CREATE INDEX idx_publisher_offerings_active ON publisher_offerings(is_active) WHERE is_active = true;
CREATE INDEX idx_publisher_offerings_availability ON publisher_offerings(current_availability);
CREATE INDEX idx_publisher_offerings_price ON publisher_offerings(base_price);
CREATE INDEX idx_publisher_offerings_attributes ON publisher_offerings USING GIN (attributes);

-- ============================================================================
-- STEP 3: Pricing Rules Engine
-- Complex pricing rules and conditions
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
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
  /* Example conditions:
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
  /* Example actions:
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
CREATE INDEX idx_pricing_rules_offering ON pricing_rules(publisher_offering_id);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority);
CREATE INDEX idx_pricing_rules_conditions ON pricing_rules USING GIN (conditions);

-- ============================================================================
-- STEP 4: Publisher Performance Tracking
-- Track publisher reliability and performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Performance Metrics
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

CREATE TRIGGER update_publisher_websites_updated_at BEFORE UPDATE ON publisher_websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_offerings_updated_at BEFORE UPDATE ON publisher_offerings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publisher_performance_updated_at BEFORE UPDATE ON publisher_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Add publisher linking fields to existing tables
-- ============================================================================

-- Add organization_id to publishers table to support organization grouping
ALTER TABLE publishers 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS claim_status VARCHAR(20) DEFAULT 'pending'
    CHECK (claim_status IN ('pending', 'verified', 'active', 'suspended'));

-- Add publisher-specific fields to websites table if needed
ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS publisher_managed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_publisher_id UUID REFERENCES publishers(id);

-- ============================================================================
-- STEP 8: Create helpful views for common queries
-- ============================================================================

-- View: Active publisher offerings with website details
CREATE OR REPLACE VIEW v_active_publisher_offerings AS
SELECT 
  po.*,
  pw.publisher_id,
  pw.website_id,
  pw.relationship_type,
  pw.verification_status,
  pw.priority_rank,
  w.domain,
  w.domain_rating,
  w.total_traffic,
  p.email as publisher_email,
  p.company_name as publisher_company
FROM publisher_offerings po
JOIN publisher_websites pw ON po.publisher_website_id = pw.id
JOIN websites w ON pw.website_id = w.id
JOIN publishers p ON pw.publisher_id = p.id
WHERE po.is_active = true 
  AND pw.is_active = true
  AND p.status = 'active';

-- View: Publisher performance summary
CREATE OR REPLACE VIEW v_publisher_performance_summary AS
SELECT 
  p.id as publisher_id,
  p.email,
  p.company_name,
  COUNT(DISTINCT pw.website_id) as websites_managed,
  COUNT(DISTINCT po.id) as active_offerings,
  AVG(perf.reliability_score) as avg_reliability_score,
  SUM(perf.total_orders) as total_orders,
  SUM(perf.total_revenue) as total_revenue
FROM publishers p
LEFT JOIN publisher_websites pw ON p.id = pw.publisher_id AND pw.is_active = true
LEFT JOIN publisher_offerings po ON pw.id = po.publisher_website_id AND po.is_active = true
LEFT JOIN publisher_performance perf ON p.id = perf.publisher_id
WHERE p.status = 'active'
GROUP BY p.id, p.email, p.company_name;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Save separately)
-- ============================================================================
/*
BEGIN TRANSACTION;

DROP VIEW IF EXISTS v_publisher_performance_summary;
DROP VIEW IF EXISTS v_active_publisher_offerings;

DROP TABLE IF EXISTS publisher_email_claims;
DROP TABLE IF EXISTS publisher_performance;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS publisher_offerings;
DROP TABLE IF EXISTS publisher_websites;

ALTER TABLE publishers 
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS claim_status;

ALTER TABLE websites
  DROP COLUMN IF EXISTS publisher_managed,
  DROP COLUMN IF EXISTS primary_publisher_id;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

COMMIT;
*/