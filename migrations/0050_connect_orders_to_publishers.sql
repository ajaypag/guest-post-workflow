-- Migration: Connect Orders to Publishers
-- Purpose: Enable order flow to publishers, earnings tracking, and commission management
-- Date: 2025-02-15

-- ============================================================================
-- Phase 1: Add Publisher Connection to Order Line Items
-- ============================================================================

-- Add publisher tracking to order_line_items
ALTER TABLE order_line_items 
ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES publishers(id),
ADD COLUMN IF NOT EXISTS publisher_offering_id UUID REFERENCES publisher_offerings(id),
ADD COLUMN IF NOT EXISTS publisher_price BIGINT, -- Publisher's wholesale price in cents
ADD COLUMN IF NOT EXISTS platform_fee BIGINT, -- Platform commission in cents
ADD COLUMN IF NOT EXISTS publisher_status VARCHAR(50) DEFAULT 'pending',
-- pending -> notified -> accepted -> in_progress -> submitted -> approved -> published -> paid
ADD COLUMN IF NOT EXISTS publisher_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS publisher_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS publisher_submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS publisher_paid_at TIMESTAMP;

-- Add indexes for publisher queries
CREATE INDEX IF NOT EXISTS idx_line_items_publisher_id ON order_line_items(publisher_id);
CREATE INDEX IF NOT EXISTS idx_line_items_publisher_status ON order_line_items(publisher_status);
CREATE INDEX IF NOT EXISTS idx_line_items_publisher_offering ON order_line_items(publisher_offering_id);

-- ============================================================================
-- Phase 2: Publisher Earnings Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  order_line_item_id UUID REFERENCES order_line_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Earnings Details
  earning_type VARCHAR(50) NOT NULL, -- 'order_completion', 'bonus', 'referral', 'adjustment'
  amount BIGINT NOT NULL, -- Amount in cents (positive for earnings, negative for deductions)
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Commission Structure
  gross_amount BIGINT, -- Total amount before platform fee
  platform_fee_percent DECIMAL(5,2), -- Platform commission percentage
  platform_fee_amount BIGINT, -- Platform commission in cents
  net_amount BIGINT NOT NULL, -- Publisher receives this amount
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, paid, cancelled
  confirmed_at TIMESTAMP,
  
  -- Payment Information
  payment_batch_id UUID,
  payment_method VARCHAR(50), -- 'bank_transfer', 'paypal', 'wise', etc.
  payment_reference VARCHAR(255),
  paid_at TIMESTAMP,
  
  -- Additional Context
  website_id UUID REFERENCES websites(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for earnings queries
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_publisher ON publisher_earnings(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_status ON publisher_earnings(status);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_created ON publisher_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_publisher_earnings_payment_batch ON publisher_earnings(payment_batch_id);

-- ============================================================================
-- Phase 3: Publisher Payment Batches
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Batch Details
  publisher_id UUID REFERENCES publishers(id),
  payment_method VARCHAR(50) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Amounts
  total_earnings BIGINT NOT NULL, -- Sum of all earnings in batch
  total_deductions BIGINT DEFAULT 0, -- Any deductions
  net_amount BIGINT NOT NULL, -- Final payment amount
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, processing, completed, failed
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Payment Details
  payment_reference VARCHAR(255),
  payment_notes TEXT,
  paid_at TIMESTAMP,
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  earnings_count INTEGER DEFAULT 0, -- Number of earnings in batch
  period_start DATE,
  period_end DATE,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_batches_publisher ON publisher_payment_batches(publisher_id);
CREATE INDEX IF NOT EXISTS idx_payment_batches_status ON publisher_payment_batches(status);
CREATE INDEX IF NOT EXISTS idx_payment_batches_created ON publisher_payment_batches(created_at);

-- ============================================================================
-- Phase 4: Publisher Order Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  order_line_item_id UUID REFERENCES order_line_items(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type VARCHAR(50) NOT NULL, -- 'new_order', 'order_approved', 'payment_sent', etc.
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'dashboard', 'webhook'
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, read
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Content
  subject VARCHAR(500),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publisher_notifications_publisher ON publisher_order_notifications(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_notifications_line_item ON publisher_order_notifications(order_line_item_id);
CREATE INDEX IF NOT EXISTS idx_publisher_notifications_status ON publisher_order_notifications(status);
CREATE INDEX IF NOT EXISTS idx_publisher_notifications_type ON publisher_order_notifications(notification_type);

-- ============================================================================
-- Phase 5: Commission Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  scope_type VARCHAR(50) NOT NULL, -- 'global', 'publisher', 'website', 'offering_type'
  scope_id UUID, -- NULL for global, otherwise references publisher/website/etc
  
  -- Commission Structure
  commission_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed', 'tiered'
  base_commission_percent DECIMAL(5,2), -- Base platform commission (e.g., 30%)
  
  -- Tiered Commission (JSON structure for complex rules)
  tier_rules JSONB DEFAULT '[]',
  /* Example tier_rules:
  [
    {"min_volume": 0, "max_volume": 10, "commission_percent": 35},
    {"min_volume": 11, "max_volume": 50, "commission_percent": 30},
    {"min_volume": 51, "max_volume": null, "commission_percent": 25}
  ]
  */
  
  -- Special Rates
  rush_order_commission_percent DECIMAL(5,2),
  bulk_order_commission_percent DECIMAL(5,2),
  
  -- Validity
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_config_scope ON commission_configurations(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_commission_config_active ON commission_configurations(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_config_unique_scope ON commission_configurations(scope_type, scope_id) 
  WHERE is_active = true AND valid_until IS NULL;

-- ============================================================================
-- Phase 6: Publisher Analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS publisher_order_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id),
  
  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  period_date DATE NOT NULL,
  
  -- Order Metrics
  total_orders INTEGER DEFAULT 0,
  pending_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  
  -- Financial Metrics
  gross_earnings BIGINT DEFAULT 0,
  platform_fees BIGINT DEFAULT 0,
  net_earnings BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  pending_payment BIGINT DEFAULT 0,
  
  -- Performance Metrics
  avg_completion_days DECIMAL(10,2),
  acceptance_rate DECIMAL(5,2),
  on_time_rate DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  
  -- Comparison Metrics
  orders_change_percent DECIMAL(10,2), -- vs previous period
  earnings_change_percent DECIMAL(10,2), -- vs previous period
  
  -- Timestamps
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(publisher_id, website_id, period_type, period_date)
);

CREATE INDEX IF NOT EXISTS idx_publisher_analytics_publisher ON publisher_order_analytics(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_analytics_period ON publisher_order_analytics(period_type, period_date);
CREATE INDEX IF NOT EXISTS idx_publisher_analytics_website ON publisher_order_analytics(website_id);

-- ============================================================================
-- Default Commission Configuration
-- ============================================================================

-- Insert default global commission (30% platform fee)
INSERT INTO commission_configurations (
  scope_type,
  scope_id,
  commission_type,
  base_commission_percent,
  notes,
  created_by
)
SELECT 
  'global',
  NULL,
  'percentage',
  30.00,
  'Default platform commission - 30% of publisher price',
  id
FROM users 
WHERE email = 'admin@linkio.com' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate platform fee based on configuration
CREATE OR REPLACE FUNCTION calculate_platform_fee(
  p_publisher_id UUID,
  p_website_id UUID,
  p_amount BIGINT,
  p_order_type VARCHAR DEFAULT 'standard'
)
RETURNS TABLE(
  platform_fee BIGINT,
  commission_percent DECIMAL(5,2)
) AS $$
DECLARE
  v_commission_percent DECIMAL(5,2);
  v_platform_fee BIGINT;
BEGIN
  -- Get applicable commission rate (priority: publisher > website > global)
  SELECT COALESCE(
    -- Publisher-specific rate
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'publisher' AND scope_id = p_publisher_id 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Website-specific rate  
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'website' AND scope_id = p_website_id 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Global rate
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'global' AND scope_id IS NULL 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Fallback default
    30.00
  ) INTO v_commission_percent;
  
  -- Calculate fee
  v_platform_fee := ROUND(p_amount * v_commission_percent / 100);
  
  RETURN QUERY SELECT v_platform_fee, v_commission_percent;
END;
$$ LANGUAGE plpgsql;

-- Function to get publisher's pending earnings
CREATE OR REPLACE FUNCTION get_publisher_pending_earnings(p_publisher_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(net_amount) 
     FROM publisher_earnings 
     WHERE publisher_id = p_publisher_id 
     AND status IN ('pending', 'confirmed')
     AND payment_batch_id IS NULL),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to create earnings record when order line item is completed
CREATE OR REPLACE FUNCTION create_publisher_earning_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_platform_fee_info RECORD;
BEGIN
  -- Only process if status changed to 'completed' and publisher is assigned
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.publisher_id IS NOT NULL THEN
    
    -- Calculate platform fee
    SELECT * INTO v_platform_fee_info 
    FROM calculate_platform_fee(
      NEW.publisher_id,
      (SELECT website_id FROM publisher_offering_relationships 
       WHERE publisher_id = NEW.publisher_id LIMIT 1),
      NEW.publisher_price,
      'standard'
    );
    
    -- Create earnings record
    INSERT INTO publisher_earnings (
      publisher_id,
      order_line_item_id,
      order_id,
      earning_type,
      amount,
      gross_amount,
      platform_fee_percent,
      platform_fee_amount,
      net_amount,
      status,
      website_id,
      description
    ) VALUES (
      NEW.publisher_id,
      NEW.id,
      NEW.order_id,
      'order_completion',
      NEW.publisher_price,
      NEW.publisher_price,
      v_platform_fee_info.commission_percent,
      v_platform_fee_info.platform_fee,
      NEW.publisher_price - v_platform_fee_info.platform_fee,
      'pending',
      (SELECT website_id FROM publisher_offering_relationships 
       WHERE publisher_id = NEW.publisher_id LIMIT 1),
      'Earnings for completed order'
    );
    
    -- Update publisher status
    NEW.publisher_status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_create_publisher_earning ON order_line_items;
CREATE TRIGGER trigger_create_publisher_earning
AFTER UPDATE ON order_line_items
FOR EACH ROW
EXECUTE FUNCTION create_publisher_earning_on_completion();

-- ============================================================================
-- Grants (adjust based on your user roles)
-- ============================================================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;