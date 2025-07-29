-- Order System Tables for Advertiser Layer (No FK to bulk_analysis_domains)
-- This migration adds support for advertisers to order guest posts

-- Orders table - central entity for advertiser orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  advertiser_id UUID, -- NULL until account created
  advertiser_email VARCHAR(255) NOT NULL,
  advertiser_name VARCHAR(255) NOT NULL,
  advertiser_company VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Possible values: draft, shared, pending_approval, approved, invoiced, paid, in_progress, completed, cancelled
  
  -- Pricing (all amounts in cents to avoid decimal issues)
  subtotal_retail INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_retail INTEGER NOT NULL DEFAULT 0,
  total_wholesale INTEGER NOT NULL DEFAULT 0, -- Internal only
  profit_margin INTEGER NOT NULL DEFAULT 0,   -- Internal only
  
  -- Optional services
  includes_client_review BOOLEAN DEFAULT FALSE,
  client_review_fee INTEGER DEFAULT 0,
  rush_delivery BOOLEAN DEFAULT FALSE,
  rush_fee INTEGER DEFAULT 0,
  
  -- Sharing
  share_token VARCHAR(255) UNIQUE,
  share_expires_at TIMESTAMP,
  
  -- Important dates
  approved_at TIMESTAMP,
  invoiced_at TIMESTAMP,
  paid_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Metadata
  created_by UUID NOT NULL,
  assigned_to UUID, -- Account manager
  internal_notes TEXT,
  advertiser_notes TEXT,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order items (individual domains in an order)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  domain_id UUID NOT NULL, -- Changed: No FK for now
  domain VARCHAR(255) NOT NULL, -- Denormalized for performance
  
  -- Domain metrics (denormalized from bulk analysis)
  domain_rating INTEGER,
  traffic INTEGER,
  
  -- Pricing
  retail_price INTEGER NOT NULL, -- What advertiser sees
  wholesale_price INTEGER NOT NULL, -- What we pay
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Possible values: pending, workflow_created, in_progress, completed, published, cancelled
  
  -- Workflow tracking
  workflow_id UUID,
  workflow_status VARCHAR(50),
  workflow_created_at TIMESTAMP,
  workflow_completed_at TIMESTAMP,
  
  -- Publication details
  published_url TEXT,
  published_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Share tokens for order access
CREATE TABLE IF NOT EXISTS order_share_tokens (
  token VARCHAR(255) PRIMARY KEY,
  order_id UUID NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['view'],
  expires_at TIMESTAMP NOT NULL,
  
  -- Usage tracking
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  used_by_ip VARCHAR(45),
  use_count INTEGER DEFAULT 0
);

-- Advertiser access control
CREATE TABLE IF NOT EXISTS advertiser_order_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL,
  order_id UUID NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  UNIQUE(advertiser_id, order_id)
);

-- Domain suggestions for advertisers
CREATE TABLE IF NOT EXISTS domain_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID, -- NULL for email-only
  advertiser_email VARCHAR(255), -- For pre-account suggestions
  domain_id UUID NOT NULL, -- Changed: No FK for now
  order_id UUID, -- If added to order
  
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[], -- Why this domain matches advertiser
  retail_price INTEGER NOT NULL,
  
  suggested_by UUID NOT NULL,
  suggested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- When suggestion expires
  
  status VARCHAR(50) DEFAULT 'pending',
  -- Possible values: pending, viewed, added_to_order, rejected, expired
  
  viewed_at TIMESTAMP,
  response_at TIMESTAMP,
  advertiser_notes TEXT
  
  -- Note: Unique constraint will be added separately after table creation
);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Pricing rules for volume discounts
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID, -- NULL for global rules
  name VARCHAR(255) NOT NULL,
  
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL for open-ended
  discount_percent DECIMAL(5,2) NOT NULL,
  
  valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_advertiser_id ON orders(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_share_token ON orders(share_token);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_domain_id ON order_items(domain_id);
CREATE INDEX IF NOT EXISTS idx_order_items_workflow_id ON order_items(workflow_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

CREATE INDEX IF NOT EXISTS idx_suggestions_advertiser ON domain_suggestions(advertiser_id, advertiser_email);
CREATE INDEX IF NOT EXISTS idx_suggestions_domain ON domain_suggestions(domain_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON domain_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_client ON pricing_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_quantity ON pricing_rules(min_quantity, max_quantity);

-- Add unique constraint for domain suggestions (using partial index approach)
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_suggestions_unique 
ON domain_suggestions (advertiser_id, domain_id) 
WHERE advertiser_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_suggestions_unique_email 
ON domain_suggestions (advertiser_email, domain_id) 
WHERE advertiser_id IS NULL;

-- Add order reference to workflows table (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflows') THEN
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS order_item_id UUID;
        CREATE INDEX IF NOT EXISTS idx_workflows_order_item ON workflows(order_item_id);
    END IF;
END $$;

-- Default pricing rules (using system placeholder UUID)
DO $$
DECLARE
    system_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
    INSERT INTO pricing_rules (name, min_quantity, max_quantity, discount_percent, created_by) VALUES
      ('Small Order', 1, 4, 0, system_user_id),
      ('Medium Order', 5, 9, 5, system_user_id),
      ('Large Order', 10, 19, 10, system_user_id),
      ('Bulk Order', 20, 49, 15, system_user_id),
      ('Enterprise Order', 50, NULL, 20, system_user_id)
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if rules already exist or other issues
        NULL;
END $$;