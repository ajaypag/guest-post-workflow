-- ============================================================================
-- MIGRATION 0068: Vetted Sites Requests Feature
-- Date: 2025-08-24
-- Purpose: Enable managed service gateway for vetted sites discovery
-- 
-- This migration creates the infrastructure for users to request vetted sites
-- based on their target URLs, with internal team approval and fulfillment
-- ============================================================================

-- ============================================================================
-- MAIN REQUEST TABLE
-- ============================================================================

CREATE TABLE vetted_sites_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account relationship (nullable for sales tool)
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Request details
  target_urls TEXT[] NOT NULL,
  filters JSONB DEFAULT '{}', -- {min_da, max_cost, topics, etc}
  notes TEXT, -- User-provided context or requirements
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  -- Values: 'submitted', 'under_review', 'approved', 'fulfilled', 'rejected', 'expired'
  
  -- Internal management
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  fulfilled_by UUID REFERENCES users(id),
  fulfilled_at TIMESTAMP,
  
  -- Sales tool fields
  is_sales_request BOOLEAN DEFAULT FALSE,
  created_by_user UUID REFERENCES users(id), -- Internal user who created
  prospect_name VARCHAR(255),
  prospect_email VARCHAR(255),
  prospect_company VARCHAR(255),
  share_token VARCHAR(255) UNIQUE, -- For public sharing
  share_expires_at TIMESTAMP,
  
  -- Attribution tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referring_url TEXT,
  
  -- Claim functionality
  claimed_by_account UUID REFERENCES accounts(id),
  claimed_at TIMESTAMP,
  claim_token VARCHAR(255) UNIQUE,
  claim_expires_at TIMESTAMP,
  
  -- Metrics
  domain_count INTEGER DEFAULT 0,
  qualified_domain_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- JUNCTION TABLES FOR M:N RELATIONSHIPS
-- ============================================================================

-- Link requests to multiple clients (for multi-client requests)
CREATE TABLE vetted_request_clients (
  request_id UUID NOT NULL REFERENCES vetted_sites_requests(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (request_id, client_id)
);

-- Link requests to bulk analysis projects (results)
CREATE TABLE vetted_request_projects (
  request_id UUID NOT NULL REFERENCES vetted_sites_requests(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (request_id, project_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookups
CREATE INDEX idx_vetted_requests_account ON vetted_sites_requests(account_id);
CREATE INDEX idx_vetted_requests_status ON vetted_sites_requests(status);
CREATE INDEX idx_vetted_requests_created_at ON vetted_sites_requests(created_at DESC);

-- Sales tool lookups
CREATE INDEX idx_vetted_requests_share_token ON vetted_sites_requests(share_token) 
  WHERE share_token IS NOT NULL;
CREATE INDEX idx_vetted_requests_claim_token ON vetted_sites_requests(claim_token)
  WHERE claim_token IS NOT NULL;
CREATE INDEX idx_vetted_requests_sales ON vetted_sites_requests(is_sales_request)
  WHERE is_sales_request = true;

-- Internal management
CREATE INDEX idx_vetted_requests_reviewed ON vetted_sites_requests(reviewed_at)
  WHERE reviewed_at IS NOT NULL;
CREATE INDEX idx_vetted_requests_fulfilled ON vetted_sites_requests(fulfilled_at)
  WHERE fulfilled_at IS NOT NULL;

-- Junction table indexes
CREATE INDEX idx_request_clients_request ON vetted_request_clients(request_id);
CREATE INDEX idx_request_clients_client ON vetted_request_clients(client_id);
CREATE INDEX idx_request_projects_request ON vetted_request_projects(request_id);
CREATE INDEX idx_request_projects_project ON vetted_request_projects(project_id);

-- ============================================================================
-- ADD REQUEST TRACKING TO EXISTING TABLES
-- ============================================================================

-- Add request reference to bulk_analysis_projects
ALTER TABLE bulk_analysis_projects
ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES vetted_sites_requests(id),
ADD COLUMN IF NOT EXISTS is_from_request BOOLEAN DEFAULT FALSE;

-- Add request reference to bulk_analysis_domains
ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES vetted_sites_requests(id),
ADD COLUMN IF NOT EXISTS added_from_request_at TIMESTAMP;

-- Index for finding domains from requests
CREATE INDEX idx_bulk_domains_request ON bulk_analysis_domains(source_request_id)
  WHERE source_request_id IS NOT NULL;

-- ============================================================================
-- DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE vetted_sites_requests IS 'Managed service requests for vetted sites discovery based on target URLs';
COMMENT ON COLUMN vetted_sites_requests.target_urls IS 'Array of target page URLs the user wants to match against';
COMMENT ON COLUMN vetted_sites_requests.filters IS 'JSON object with filtering criteria like min_da, max_cost, topics';
COMMENT ON COLUMN vetted_sites_requests.share_token IS 'Unique token for public sharing of results (sales tool)';
COMMENT ON COLUMN vetted_sites_requests.claim_token IS 'Token for account holders to claim sales-generated analyses';
COMMENT ON COLUMN vetted_sites_requests.is_sales_request IS 'True if created by internal team for sales purposes';

COMMENT ON TABLE vetted_request_clients IS 'Links vetted sites requests to multiple client contexts';
COMMENT ON TABLE vetted_request_projects IS 'Links requests to resulting bulk analysis projects';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('vetted_sites_requests', 'vetted_request_clients', 'vetted_request_projects');
*/

-- Verify columns were added to existing tables
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('bulk_analysis_projects', 'bulk_analysis_domains')
  AND column_name LIKE '%request%'
ORDER BY table_name, column_name;
*/

-- Verify indexes were created
/*
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('vetted_sites_requests', 'vetted_request_clients', 'vetted_request_projects')
ORDER BY indexname;
*/

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- TO ROLLBACK THIS MIGRATION (if needed):
/*
-- Drop indexes on existing tables first
DROP INDEX IF EXISTS idx_bulk_domains_request;

-- Remove columns from existing tables
ALTER TABLE bulk_analysis_domains
DROP COLUMN IF EXISTS source_request_id,
DROP COLUMN IF EXISTS added_from_request_at;

ALTER TABLE bulk_analysis_projects
DROP COLUMN IF EXISTS source_request_id,
DROP COLUMN IF EXISTS is_from_request;

-- Drop junction tables
DROP TABLE IF EXISTS vetted_request_projects;
DROP TABLE IF EXISTS vetted_request_clients;

-- Drop main table
DROP TABLE IF EXISTS vetted_sites_requests;
*/

-- ============================================================================
-- EXPECTED IMPACT
-- ============================================================================

-- Performance Impact: Minimal (sparse indexes, proper foreign keys)
-- Storage Impact: ~500 bytes per request + junction table entries
-- Data Impact: No existing data modified, only additive changes
-- Downtime: None (additive changes only)