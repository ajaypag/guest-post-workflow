-- Migration 0027: Add Order Line Items System
-- This replaces the complex orderGroups + submissions model with a simpler line-item approach

-- Order Line Items - Each link is a separate line item
CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Client & Target Information
  client_id UUID NOT NULL REFERENCES clients(id),
  target_page_id UUID REFERENCES target_pages(id),
  target_page_url VARCHAR(500),
  anchor_text VARCHAR(255),
  
  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft -> pending_selection -> selected -> approved -> in_progress -> delivered -> completed
  -- Can also be: cancelled, refunded, disputed
  
  -- Site Assignment
  assigned_domain_id UUID REFERENCES bulk_analysis_domains(id),
  assigned_domain VARCHAR(255),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  
  -- Pricing (locked at approval)
  estimated_price INTEGER, -- In cents
  approved_price INTEGER, -- Locked when client approves
  wholesale_price INTEGER,
  service_fee INTEGER DEFAULT 7900, -- $79
  final_price INTEGER, -- What was actually charged
  
  -- Client Review
  client_review_status VARCHAR(20),
  -- pending, approved, rejected, change_requested
  client_reviewed_at TIMESTAMP,
  client_review_notes TEXT,
  
  -- Delivery Tracking
  workflow_id UUID,
  draft_url VARCHAR(500),
  published_url VARCHAR(500),
  delivered_at TIMESTAMP,
  delivery_notes TEXT,
  
  -- Change Tracking
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id),
  modified_at TIMESTAMP,
  modified_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Metadata for flexibility
  metadata JSONB,
  
  -- Display ordering
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Versioning for optimistic locking
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS line_items_order_id_idx ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS line_items_client_id_idx ON order_line_items(client_id);
CREATE INDEX IF NOT EXISTS line_items_status_idx ON order_line_items(status);
CREATE INDEX IF NOT EXISTS line_items_assigned_domain_idx ON order_line_items(assigned_domain_id);

-- Line Item Change Log - Audit trail for all changes
CREATE TABLE IF NOT EXISTS line_item_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES order_line_items(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  change_type VARCHAR(50) NOT NULL,
  -- created, status_changed, client_changed, domain_assigned, domain_changed,
  -- price_changed, cancelled, restored, target_changed, anchor_changed
  
  previous_value JSONB,
  new_value JSONB,
  
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  
  -- For grouping bulk changes
  batch_id UUID,
  
  metadata JSONB
);

-- Indexes for change log
CREATE INDEX IF NOT EXISTS changes_line_item_id_idx ON line_item_changes(line_item_id);
CREATE INDEX IF NOT EXISTS changes_order_id_idx ON line_item_changes(order_id);
CREATE INDEX IF NOT EXISTS changes_changed_at_idx ON line_item_changes(changed_at);
CREATE INDEX IF NOT EXISTS changes_batch_id_idx ON line_item_changes(batch_id);

-- Line Item Templates - For bulk creation
CREATE TABLE IF NOT EXISTS line_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template data
  client_id UUID NOT NULL REFERENCES clients(id),
  target_page_url VARCHAR(500),
  anchor_text_pattern VARCHAR(500), -- Can use placeholders like {keyword}, {brand}, {number}
  
  quantity INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  metadata JSONB
);

-- Add comment for documentation
COMMENT ON TABLE order_line_items IS 'New line-item based order system - each link is a separate trackable unit';
COMMENT ON TABLE line_item_changes IS 'Audit trail for all changes to line items';
COMMENT ON TABLE line_item_templates IS 'Templates for bulk creation of similar line items';