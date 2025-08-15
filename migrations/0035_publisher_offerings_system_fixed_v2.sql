-- ============================================================================
-- Publisher Offerings System - Complete Schema (FIXED VERSION)
-- Version: 2.0 - Handles missing columns gracefully
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create publisher_offerings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL,
  offering_type VARCHAR(50) NOT NULL, -- 'guest_post', 'link_insertion', 'content_creation'
  base_price INTEGER NOT NULL, -- in cents
  turnaround_days INTEGER,
  min_word_count INTEGER,
  max_word_count INTEGER,
  niches TEXT[], -- array of supported niches
  languages VARCHAR(10)[] DEFAULT ARRAY['en'],
  attributes JSONB DEFAULT '{}', -- flexible attributes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create publisher_offering_relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_offering_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL,
  offering_id UUID NOT NULL,
  website_id UUID NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  custom_terms JSONB DEFAULT '{}',
  verified_at TIMESTAMP,
  verified_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(publisher_id, website_id)
);

-- ============================================================================
-- STEP 3: Create publisher_pricing_rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_offering_id UUID NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'bulk_discount', 'seasonal', 'client_specific'
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- conditions for rule application
  actions JSONB NOT NULL, -- pricing adjustments
  priority INTEGER DEFAULT 0,
  is_cumulative BOOLEAN DEFAULT false,
  auto_apply BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Create publisher_performance
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL,
  website_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(10,2),
  avg_turnaround_days DECIMAL(10,2),
  on_time_delivery_rate DECIMAL(5,2),
  client_satisfaction_score DECIMAL(3,2),
  revenue_generated INTEGER DEFAULT 0,
  commission_earned INTEGER DEFAULT 0,
  reliability_score DECIMAL(3,2),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(publisher_id, website_id, period_start, period_end)
);

-- ============================================================================
-- STEP 5: Create publisher_payouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL,
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,
  total_amount INTEGER NOT NULL, -- in cents
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_publisher_offerings_publisher_id ON publisher_offerings(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_offerings_type ON publisher_offerings(offering_type);
CREATE INDEX IF NOT EXISTS idx_publisher_offerings_active ON publisher_offerings(is_active);

CREATE INDEX IF NOT EXISTS idx_publisher_relationships_publisher ON publisher_offering_relationships(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_relationships_website ON publisher_offering_relationships(website_id);
CREATE INDEX IF NOT EXISTS idx_publisher_relationships_offering ON publisher_offering_relationships(offering_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_offering ON publisher_pricing_rules(publisher_offering_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON publisher_pricing_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_performance_publisher ON publisher_performance(publisher_id);
CREATE INDEX IF NOT EXISTS idx_performance_website ON publisher_performance(website_id);
CREATE INDEX IF NOT EXISTS idx_performance_period ON publisher_performance(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_payouts_publisher ON publisher_payouts(publisher_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON publisher_payouts(status);

-- ============================================================================
-- STEP 7: Add comments
-- ============================================================================
COMMENT ON TABLE publisher_offerings IS 'Defines specific service offerings by publishers';
COMMENT ON TABLE publisher_offering_relationships IS 'Links publishers to websites with specific offerings';
COMMENT ON TABLE publisher_pricing_rules IS 'Dynamic pricing rules for publisher offerings';
COMMENT ON TABLE publisher_performance IS 'Tracks publisher performance metrics over time';
COMMENT ON TABLE publisher_payouts IS 'Records publisher payment history';

-- ============================================================================
-- STEP 8: Create publisher_email_claims table for email-based website claiming
-- ============================================================================
CREATE TABLE IF NOT EXISTS publisher_email_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  email_domain VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) UNIQUE NOT NULL,
  verification_sent_at TIMESTAMP,
  verified_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, expired
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(publisher_id, website_id)
);

CREATE INDEX IF NOT EXISTS idx_email_claims_publisher ON publisher_email_claims(publisher_id);
CREATE INDEX IF NOT EXISTS idx_email_claims_website ON publisher_email_claims(website_id);
CREATE INDEX IF NOT EXISTS idx_email_claims_token ON publisher_email_claims(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_claims_status ON publisher_email_claims(status);

-- ============================================================================
-- STEP 9: Create trigger functions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_publisher_offerings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_publisher_offerings_timestamp
  BEFORE UPDATE ON publisher_offerings
  FOR EACH ROW
  EXECUTE FUNCTION update_publisher_offerings_updated_at();

CREATE TRIGGER update_publisher_relationships_timestamp
  BEFORE UPDATE ON publisher_offering_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_publisher_offerings_updated_at();

CREATE TRIGGER update_pricing_rules_timestamp
  BEFORE UPDATE ON publisher_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_publisher_offerings_updated_at();

CREATE TRIGGER update_performance_timestamp
  BEFORE UPDATE ON publisher_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_publisher_offerings_updated_at();

-- ============================================================================
-- STEP 10: Create views (without referencing non-existent columns)
-- ============================================================================

-- View: Active publisher offerings with website details
CREATE OR REPLACE VIEW v_active_publisher_offerings AS
SELECT 
  po.id as offering_id,
  po.publisher_id,
  p.company_name as publisher_name,
  po.offering_type,
  po.base_price,
  po.turnaround_days,
  w.id as website_id,
  w.domain,
  w.domain_rating,
  w.total_traffic,
  por.is_primary,
  por.verified_at
FROM publisher_offerings po
JOIN publisher_offering_relationships por ON po.id = por.offering_id
JOIN websites w ON por.website_id = w.id
JOIN publishers p ON por.publisher_id = p.id
WHERE po.is_active = true 
  AND por.is_active = true
  AND p.status = 'active';

-- View: Publisher performance (simplified without missing columns)
CREATE OR REPLACE VIEW v_publisher_performance_complete AS
SELECT 
  COALESCE(pp.publisher_id, p.id) as publisher_id,
  w.id as website_id,
  w.domain,
  pp.avg_response_time_hours as response_time,
  pp.on_time_delivery_rate as success_rate,
  pp.total_orders as total_orders,
  pp.reliability_score,
  pp.client_satisfaction_score
FROM websites w
LEFT JOIN publisher_offering_relationships por ON w.id = por.website_id
LEFT JOIN publishers p ON por.publisher_id = p.id
LEFT JOIN publisher_performance pp ON p.id = pp.publisher_id AND w.id = pp.website_id;

-- ============================================================================
-- STEP 11: Migration helper functions
-- ============================================================================

-- Function to migrate existing website pricing to new system
CREATE OR REPLACE FUNCTION migrate_website_pricing_to_offerings()
RETURNS void AS $$
DECLARE
  website_record RECORD;
  publisher_record RECORD;
  offering_id UUID;
BEGIN
  -- For each website with a publisher and guest post cost
  FOR website_record IN 
    SELECT w.*, pw.publisher_id 
    FROM websites w
    JOIN publisher_websites pw ON w.id = pw.website_id
    WHERE w.guest_post_cost IS NOT NULL
  LOOP
    -- Create offering if publisher exists
    SELECT * INTO publisher_record FROM publishers WHERE id = website_record.publisher_id;
    
    IF publisher_record.id IS NOT NULL THEN
      -- Create guest post offering
      INSERT INTO publisher_offerings (
        publisher_id,
        offering_type,
        base_price,
        turnaround_days,
        is_active
      ) VALUES (
        publisher_record.id,
        'guest_post',
        website_record.guest_post_cost::INTEGER,
        7, -- default turnaround
        true
      ) RETURNING id INTO offering_id;
      
      -- Create relationship
      INSERT INTO publisher_offering_relationships (
        publisher_id,
        offering_id,
        website_id,
        is_primary,
        is_active
      ) VALUES (
        publisher_record.id,
        offering_id,
        website_record.id,
        true,
        true
      ) ON CONFLICT (publisher_id, website_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 12: Add foreign key constraints (at the end to avoid dependency issues)
-- ============================================================================
ALTER TABLE publisher_offerings 
  ADD CONSTRAINT fk_publisher_offerings_publisher 
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;

ALTER TABLE publisher_offering_relationships
  ADD CONSTRAINT fk_relationships_publisher 
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_relationships_offering 
  FOREIGN KEY (offering_id) REFERENCES publisher_offerings(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_relationships_website 
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_relationships_verified_by 
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE publisher_pricing_rules
  ADD CONSTRAINT fk_pricing_rules_offering 
  FOREIGN KEY (publisher_offering_id) REFERENCES publisher_offerings(id) ON DELETE CASCADE;

ALTER TABLE publisher_performance
  ADD CONSTRAINT fk_performance_publisher 
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_performance_website 
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL;

ALTER TABLE publisher_payouts
  ADD CONSTRAINT fk_payouts_publisher 
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- Post-migration message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Publisher offerings system migration completed successfully!';
  RAISE NOTICE 'Run migrate_website_pricing_to_offerings() to migrate existing data.';
END $$;