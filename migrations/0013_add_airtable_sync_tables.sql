-- Add Airtable sync tables for local website database

-- Website table to store Airtable data locally
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  domain_rating INTEGER,
  total_traffic INTEGER,
  guest_post_cost DECIMAL(10, 2),
  categories TEXT[],
  type TEXT[],
  status VARCHAR(50) DEFAULT 'Unknown',
  has_guest_post BOOLEAN DEFAULT false,
  has_link_insert BOOLEAN DEFAULT false,
  published_opportunities INTEGER DEFAULT 0,
  overall_quality VARCHAR(255),
  
  -- Airtable metadata
  airtable_created_at TIMESTAMP NOT NULL,
  airtable_updated_at TIMESTAMP NOT NULL,
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Local metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_websites_domain ON websites(domain);
CREATE INDEX idx_websites_domain_rating ON websites(domain_rating);
CREATE INDEX idx_websites_total_traffic ON websites(total_traffic);
CREATE INDEX idx_websites_status ON websites(status);

-- Website contacts table
CREATE TABLE IF NOT EXISTS website_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  email VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  has_paid_guest_post BOOLEAN DEFAULT false,
  has_swap_option BOOLEAN DEFAULT false,
  guest_post_cost DECIMAL(10, 2),
  link_insert_cost DECIMAL(10, 2),
  requirement VARCHAR(50), -- 'Paid', 'Swap', etc
  status VARCHAR(50) DEFAULT 'Active',
  
  -- Airtable reference
  airtable_link_price_id VARCHAR(255) UNIQUE,
  
  -- Local enrichment
  last_contacted TIMESTAMP,
  response_rate DECIMAL(5, 2), -- Percentage
  average_response_time INTEGER, -- Hours
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(website_id, email)
);

CREATE INDEX idx_website_contacts_website_primary ON website_contacts(website_id, is_primary);

-- Website qualifications table to track which clients have qualified which sites
CREATE TABLE IF NOT EXISTS website_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES bulk_analysis_projects(id) ON DELETE SET NULL,
  
  qualified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  qualified_by UUID NOT NULL, -- User ID
  status VARCHAR(50) DEFAULT 'qualified', -- qualified, rejected, pending
  reason TEXT, -- Why qualified/rejected
  notes TEXT,
  
  -- Tracking
  imported_from VARCHAR(50) DEFAULT 'airtable', -- airtable, manual, csv
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(website_id, client_id, project_id)
);

CREATE INDEX idx_website_qualifications_client ON website_qualifications(client_id);
CREATE INDEX idx_website_qualifications_project ON website_qualifications(project_id);

-- Sync logs for tracking import history
CREATE TABLE IF NOT EXISTS website_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  
  sync_type VARCHAR(50) NOT NULL, -- full, incremental, webhook
  action VARCHAR(50) NOT NULL, -- create, update, delete
  status VARCHAR(50) NOT NULL, -- success, failed, skipped
  
  airtable_record_id VARCHAR(255),
  changes JSONB, -- What changed
  error TEXT,
  
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0
);

CREATE INDEX idx_sync_logs_website ON website_sync_logs(website_id);
CREATE INDEX idx_sync_logs_type ON website_sync_logs(sync_type);
CREATE INDEX idx_sync_logs_started ON website_sync_logs(started_at);

-- Configuration table for sync settings
CREATE TABLE IF NOT EXISTS airtable_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS airtable_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- record.created, record.updated, record.deleted
  table_id VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error TEXT,
  
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_processed ON airtable_webhook_events(processed, received_at);
CREATE INDEX idx_webhook_events_record ON airtable_webhook_events(record_id);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_contacts_updated_at BEFORE UPDATE ON website_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_qualifications_updated_at BEFORE UPDATE ON website_qualifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_airtable_sync_config_updated_at BEFORE UPDATE ON airtable_sync_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();