-- Migration: Unified Order System with Multi-Client Support
-- This migration updates the order system to support both single and multi-client orders
-- with full site review capabilities

BEGIN;

-- 1. Rename advertisers to accounts
ALTER TABLE advertisers RENAME TO accounts;

-- 2. Rename advertiser references in orders table
ALTER TABLE orders RENAME COLUMN advertiser_id TO account_id;
ALTER TABLE orders RENAME COLUMN advertiser_email TO account_email;
ALTER TABLE orders RENAME COLUMN advertiser_name TO account_name;
ALTER TABLE orders RENAME COLUMN advertiser_company TO account_company;
ALTER TABLE orders RENAME COLUMN advertiser_notes TO account_notes;

-- 3. Update order_items to prepare for new flow
ALTER TABLE order_items ADD COLUMN order_group_id UUID;
ALTER TABLE order_items ADD COLUMN site_selection_id UUID;

-- 4. Create order_groups table
CREATE TABLE order_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  
  -- Configuration
  link_count INTEGER NOT NULL,
  target_pages JSONB DEFAULT '[]'::jsonb,
  anchor_texts JSONB DEFAULT '[]'::jsonb,
  requirement_overrides JSONB DEFAULT '{}'::jsonb,
  
  -- Analysis link
  bulk_analysis_project_id UUID REFERENCES bulk_analysis_projects(id),
  analysis_started_at TIMESTAMP,
  analysis_completed_at TIMESTAMP,
  
  -- Status
  group_status VARCHAR(50) DEFAULT 'pending',
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for order_groups
CREATE INDEX idx_order_groups_order ON order_groups(order_id);
CREATE INDEX idx_order_groups_client ON order_groups(client_id);
CREATE INDEX idx_order_groups_analysis ON order_groups(bulk_analysis_project_id);

-- 5. Create order_site_selections table
CREATE TABLE order_site_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id),
  
  -- Selection details
  status VARCHAR(50) NOT NULL DEFAULT 'suggested',
  -- Statuses: suggested, approved, rejected, alternate
  
  -- Assignment (once approved)
  target_page_url TEXT,
  anchor_text VARCHAR(255),
  
  -- Review tracking
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  client_notes TEXT,
  internal_notes TEXT,
  
  -- Becomes order_item when approved
  order_item_id UUID REFERENCES order_items(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for order_site_selections
CREATE INDEX idx_selections_group ON order_site_selections(order_group_id);
CREATE INDEX idx_selections_status ON order_site_selections(status);
CREATE INDEX idx_selections_domain ON order_site_selections(domain_id);

-- 6. Update orders table
ALTER TABLE orders ADD COLUMN state VARCHAR(50) DEFAULT 'configuring';
ALTER TABLE orders ADD COLUMN requires_client_review BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN review_completed_at TIMESTAMP;

-- 7. Migrate existing orders to use order_groups
-- Create a default group for each existing order
INSERT INTO order_groups (order_id, client_id, link_count)
SELECT 
  o.id as order_id,
  o.client_id,
  COALESCE(COUNT(oi.id), 1) as link_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.client_id IS NOT NULL
GROUP BY o.id, o.client_id;

-- Link existing order_items to their default group
UPDATE order_items oi
SET order_group_id = og.id
FROM order_groups og
WHERE og.order_id = oi.order_id;

-- 8. Now we can safely drop client_id from orders
ALTER TABLE orders DROP COLUMN client_id;

-- 9. Update other tables with advertiser references
ALTER TABLE advertiser_order_access RENAME TO account_order_access;
ALTER TABLE account_order_access RENAME COLUMN advertiser_id TO account_id;

-- Update domain_suggestions table
ALTER TABLE domain_suggestions RENAME COLUMN advertiser_id TO account_id;
ALTER TABLE domain_suggestions RENAME COLUMN advertiser_email TO account_email;
ALTER TABLE domain_suggestions RENAME COLUMN advertiser_notes TO account_notes;

-- 10. Update indexes
ALTER INDEX idx_orders_advertiser_id RENAME TO idx_orders_account_id;
ALTER INDEX idx_advertisers_email RENAME TO idx_accounts_email;
ALTER INDEX idx_advertisers_status RENAME TO idx_accounts_status;
ALTER INDEX idx_advertisers_client RENAME TO idx_accounts_client;
ALTER INDEX idx_suggestions_advertiser RENAME TO idx_suggestions_account;

-- 11. Add foreign key constraints
ALTER TABLE order_items 
  ADD CONSTRAINT fk_order_items_group 
  FOREIGN KEY (order_group_id) 
  REFERENCES order_groups(id);

ALTER TABLE order_items 
  ADD CONSTRAINT fk_order_items_selection 
  FOREIGN KEY (site_selection_id) 
  REFERENCES order_site_selections(id);

-- 12. Update check constraints if any
-- None found in current schema

-- 13. Create helper view for easy order querying
CREATE VIEW order_summary AS
SELECT 
  o.id,
  o.account_id,
  o.state,
  o.status,
  o.total_retail,
  COUNT(DISTINCT og.id) as client_count,
  SUM(og.link_count) as total_links,
  COUNT(DISTINCT oss.id) FILTER (WHERE oss.status = 'approved') as approved_sites,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN order_groups og ON og.order_id = o.id
LEFT JOIN order_site_selections oss ON oss.order_group_id = og.id
GROUP BY o.id;

COMMIT;

-- Rollback script (save separately)
/*
BEGIN;
ALTER TABLE accounts RENAME TO advertisers;
ALTER TABLE orders RENAME COLUMN account_id TO advertiser_id;
-- ... etc
ROLLBACK;
*/