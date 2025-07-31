-- Order System Tables for Advertiser Layer
-- This migration adds support for advertisers to order guest posts

-- Orders table - central entity for advertiser orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  advertiser_id UUID REFERENCES users(id), -- NULL until account created
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
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id), -- Account manager
  internal_notes TEXT,
  advertiser_notes TEXT,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order items - individual domains in an order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
  
  -- Snapshot data at order time (in case source data changes)
  domain VARCHAR(255) NOT NULL,
  domain_rating INTEGER,
  traffic INTEGER,
  retail_price INTEGER NOT NULL,
  wholesale_price INTEGER NOT NULL,
  
  -- Execution tracking
  workflow_id UUID REFERENCES workflows(id),
  workflow_status VARCHAR(50),
  workflow_created_at TIMESTAMP,
  workflow_completed_at TIMESTAMP,
  
  -- Publication tracking
  published_url VARCHAR(500),
  published_at TIMESTAMP,
  publication_verified BOOLEAN DEFAULT FALSE,
  
  -- Issue tracking
  has_issues BOOLEAN DEFAULT FALSE,
  issue_notes TEXT,
  issue_resolved_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Possible values: pending, workflow_created, in_progress, in_review, published, completed, failed
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Share tokens for pre-account access
CREATE TABLE IF NOT EXISTS order_share_tokens (
  token VARCHAR(255) PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT ARRAY['view'],
  -- Possible permissions: view, approve, comment
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Usage tracking
  used_at TIMESTAMP,
  used_by_ip VARCHAR(45),
  use_count INTEGER DEFAULT 0
);

-- Advertiser access to orders (after account creation)
CREATE TABLE IF NOT EXISTS advertiser_order_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  access_level VARCHAR(50) NOT NULL DEFAULT 'view',
  -- Possible values: view, approve, manage
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID NOT NULL REFERENCES users(id),
  
  UNIQUE(user_id, order_id)
);

-- Domain suggestions for advertisers
CREATE TABLE IF NOT EXISTS domain_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES users(id),
  advertiser_email VARCHAR(255), -- For prospects without accounts
  domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
  order_id UUID REFERENCES orders(id), -- If added to an order
  
  -- Matching metadata
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[],
  
  -- Pricing snapshot
  retail_price INTEGER NOT NULL,
  
  -- Suggestion metadata
  suggested_by UUID NOT NULL REFERENCES users(id),
  suggested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Advertiser response
  status VARCHAR(50) DEFAULT 'pending',
  -- Possible values: pending, viewed, interested, not_interested, added_to_order
  viewed_at TIMESTAMP,
  response_at TIMESTAMP,
  advertiser_notes TEXT,
  
  UNIQUE(COALESCE(advertiser_id, '00000000-0000-0000-0000-000000000000'::UUID), advertiser_email, domain_id)
);

-- Volume-based pricing rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id), -- NULL for global rules
  name VARCHAR(255) NOT NULL,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL for no upper limit
  discount_percent DECIMAL(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  
  -- Validity period
  valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure non-overlapping ranges per client
  CONSTRAINT no_overlap_check CHECK (min_quantity < COALESCE(max_quantity, 999999))
);

-- Order status history for tracking
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_advertiser_id ON orders(advertiser_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_share_token ON orders(share_token);
CREATE INDEX idx_orders_created_by ON orders(created_by);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_domain_id ON order_items(domain_id);
CREATE INDEX idx_order_items_workflow_id ON order_items(workflow_id);
CREATE INDEX idx_order_items_status ON order_items(status);

CREATE INDEX idx_suggestions_advertiser ON domain_suggestions(advertiser_id, advertiser_email);
CREATE INDEX idx_suggestions_domain ON domain_suggestions(domain_id);
CREATE INDEX idx_suggestions_status ON domain_suggestions(status);

CREATE INDEX idx_pricing_rules_client ON pricing_rules(client_id);
CREATE INDEX idx_pricing_rules_quantity ON pricing_rules(min_quantity, max_quantity);

-- Add order reference to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES order_items(id);
CREATE INDEX idx_workflows_order_item ON workflows(order_item_id);

-- Default pricing rules
INSERT INTO pricing_rules (name, min_quantity, max_quantity, discount_percent, created_by) VALUES
  ('Small Order', 1, 4, 0, '00000000-0000-0000-0000-000000000000'::UUID),
  ('Medium Order', 5, 9, 5, '00000000-0000-0000-0000-000000000000'::UUID),
  ('Large Order', 10, 19, 10, '00000000-0000-0000-0000-000000000000'::UUID),
  ('Bulk Order', 20, 49, 15, '00000000-0000-0000-0000-000000000000'::UUID),
  ('Enterprise Order', 50, NULL, 20, '00000000-0000-0000-0000-000000000000'::UUID)
ON CONFLICT DO NOTHING;