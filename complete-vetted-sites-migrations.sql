-- ============================================================================
-- COMPLETE VETTED SITES MIGRATIONS (0068, 0069, 0070)
-- Date: 2025-08-25
-- Purpose: Complete managed service gateway for vetted sites discovery
-- 
-- This consolidated migration creates the full infrastructure for:
-- - User-requested vetted sites discovery based on target URLs
-- - Internal team approval and fulfillment workflow
-- - Sales tool with public sharing and account claiming
-- - Video proposals and messaging
-- - Default target page pre-selection
-- ============================================================================

-- ============================================================================
-- MIGRATION 0068: VETTED SITES REQUESTS FEATURE (MAIN MIGRATION)
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
  
  -- Proposal fields (from migration 0069)
  proposal_video_url TEXT,
  proposal_message TEXT,
  
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

-- Add default target pages (from migration 0070)
ALTER TABLE bulk_analysis_projects 
ADD COLUMN IF NOT EXISTS default_target_page_ids JSONB DEFAULT '[]'::jsonb;

-- Add request reference to bulk_analysis_domains
ALTER TABLE bulk_analysis_domains
ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES vetted_sites_requests(id),
ADD COLUMN IF NOT EXISTS added_from_request_at TIMESTAMP;

-- Index for finding domains from requests
CREATE INDEX idx_bulk_domains_request ON bulk_analysis_domains(source_request_id)
  WHERE source_request_id IS NOT NULL;

-- ============================================================================
-- MIGRATION 0069: PROPOSAL FIELDS (INTEGRATED ABOVE)
-- ============================================================================
-- Note: proposal_video_url and proposal_message fields are already included
-- in the main vetted_sites_requests table definition above

-- ============================================================================
-- MIGRATION 0070: DEFAULT TARGET PAGES (INTEGRATED ABOVE)
-- ============================================================================
-- Note: default_target_page_ids field is already included in the 
-- bulk_analysis_projects table alteration above

-- ============================================================================
-- DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE vetted_sites_requests IS 'Managed service requests for vetted sites discovery based on target URLs';
COMMENT ON COLUMN vetted_sites_requests.target_urls IS 'Array of target page URLs the user wants to match against';
COMMENT ON COLUMN vetted_sites_requests.filters IS 'JSON object with filtering criteria like min_da, max_cost, topics';
COMMENT ON COLUMN vetted_sites_requests.share_token IS 'Unique token for public sharing of results (sales tool)';
COMMENT ON COLUMN vetted_sites_requests.claim_token IS 'Token for account holders to claim sales-generated analyses';
COMMENT ON COLUMN vetted_sites_requests.is_sales_request IS 'True if created by internal team for sales purposes';
COMMENT ON COLUMN vetted_sites_requests.proposal_video_url IS 'URL to video proposal for sales outreach';
COMMENT ON COLUMN vetted_sites_requests.proposal_message IS 'Custom message for sales proposals';

COMMENT ON TABLE vetted_request_clients IS 'Links vetted sites requests to multiple client contexts';
COMMENT ON TABLE vetted_request_projects IS 'Links requests to resulting bulk analysis projects';

COMMENT ON COLUMN bulk_analysis_projects.source_request_id IS 'References the vetted sites request that created this project';
COMMENT ON COLUMN bulk_analysis_projects.is_from_request IS 'True if this project was created from a vetted sites request';
COMMENT ON COLUMN bulk_analysis_projects.default_target_page_ids IS 'Target page IDs to pre-select when adding domains for analysis';

COMMENT ON COLUMN bulk_analysis_domains.source_request_id IS 'References the vetted sites request that added this domain';
COMMENT ON COLUMN bulk_analysis_domains.added_from_request_at IS 'Timestamp when domain was added from a vetted sites request';

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
  AND column_name LIKE '%request%' OR column_name LIKE '%target_page%'
ORDER BY table_name, column_name;
*/

-- Verify indexes were created
/*
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('vetted_sites_requests', 'vetted_request_clients', 'vetted_request_projects', 'bulk_analysis_projects', 'bulk_analysis_domains')
  AND indexname LIKE '%request%' OR indexname LIKE '%vetted%'
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- SAMPLE DATA INSERTS (FOR TESTING)
-- ============================================================================

-- Sample vetted sites request
/*
INSERT INTO vetted_sites_requests (
  target_urls, 
  filters, 
  notes, 
  prospect_name, 
  prospect_email, 
  prospect_company,
  is_sales_request,
  share_token,
  share_expires_at,
  claim_token,
  claim_expires_at
) VALUES (
  ARRAY['https://example.com/target-page', 'https://another-site.com/landing'],
  '{"min_da": 30, "max_cost": 500, "topics": ["technology", "saas"]}'::jsonb,
  'Looking for high-quality tech sites for our SaaS product launch',
  'John Doe',
  'john@example.com',
  'Example Corp',
  true,
  'sample_share_token_123',
  NOW() + INTERVAL '30 days',
  'sample_claim_token_456',
  NOW() + INTERVAL '7 days'
);
*/

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- TO ROLLBACK ALL MIGRATIONS (if needed):
/*
-- Drop indexes on existing tables first
DROP INDEX IF EXISTS idx_bulk_domains_request;

-- Remove columns from existing tables
ALTER TABLE bulk_analysis_domains
DROP COLUMN IF EXISTS source_request_id,
DROP COLUMN IF EXISTS added_from_request_at;

ALTER TABLE bulk_analysis_projects
DROP COLUMN IF EXISTS source_request_id,
DROP COLUMN IF EXISTS is_from_request,
DROP COLUMN IF EXISTS default_target_page_ids;

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
-- Storage Impact: ~600 bytes per request + junction table entries
-- Data Impact: No existing data modified, only additive changes
-- Downtime: None (additive changes only)
-- Dependencies: Requires existing accounts, clients, users tables

-- ============================================================================
-- FEATURE CAPABILITIES ENABLED
-- ============================================================================

-- 1. User-initiated vetted sites requests with target URL matching
-- 2. Internal team review and approval workflow
-- 3. Sales tool for prospect outreach with public sharing
-- 4. Account claiming system for converting prospects to customers
-- 5. Video proposals and custom messaging for sales
-- 6. Multi-client request support
-- 7. Full audit trail and attribution tracking
-- 8. Integration with existing bulk analysis system
-- 9. Default target page pre-selection for efficiency
-- 10. Comprehensive metrics and reporting capabilities