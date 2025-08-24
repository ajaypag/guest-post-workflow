-- =========================================================================
-- Production Migrations with Data Cleanup - August 23, 2024
-- =========================================================================
-- Fixes duplicate clients issue and adds Brand Intelligence System
-- =========================================================================

BEGIN;

-- =========================================================================
-- Step 1: Clean up duplicate clients
-- =========================================================================
-- First, let's see what duplicates we have
CREATE TEMP TABLE duplicate_clients AS
SELECT id, COUNT(*) as duplicate_count
FROM clients
GROUP BY id
HAVING COUNT(*) > 1;

-- Show duplicates for review
SELECT 'Found ' || COUNT(*) || ' client IDs with duplicates' as duplicate_status
FROM duplicate_clients;

-- Remove duplicates, keeping only the first one (by ctid)
DELETE FROM clients
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM clients
    GROUP BY id
);

-- Now add the primary key constraint
ALTER TABLE clients ADD PRIMARY KEY (id);

-- =========================================================================
-- Step 2: Migration 0068 - Add Client Brand Intelligence
-- =========================================================================
CREATE TABLE IF NOT EXISTS client_brand_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Deep Research Phase
  research_session_id varchar(255),
  research_status varchar(50) DEFAULT 'idle',
  research_started_at timestamp,
  research_completed_at timestamp,
  research_output jsonb,
  
  -- Client Input Phase  
  client_input text,
  client_input_at timestamp,
  
  -- Brief Generation Phase
  brief_session_id varchar(255),
  brief_status varchar(50) DEFAULT 'idle',
  brief_generated_at timestamp,
  final_brief text,
  
  -- Metadata (for structured answers - added immediately)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Tracking
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Constraints
  UNIQUE(client_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_client_id ON client_brand_intelligence(client_id);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_research_status ON client_brand_intelligence(research_status);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_brief_status ON client_brand_intelligence(brief_status);
CREATE INDEX IF NOT EXISTS idx_client_brand_intelligence_created_by ON client_brand_intelligence(created_by);
CREATE INDEX IF NOT EXISTS client_brand_intelligence_metadata_answer_token_idx 
ON client_brand_intelligence USING gin ((metadata->'answerToken'));

-- Insert migration records
INSERT INTO migrations (name, applied_at) 
VALUES ('0068_add_client_brand_intelligence', NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO migrations (name, applied_at) 
VALUES ('0069_add_brand_intelligence_metadata', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Step 3: Optional Features (only if not exists)
-- =========================================================================

-- Target URL Matching
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulk_analysis_domains' 
                   AND column_name = 'suggested_target_url') THEN
        ALTER TABLE bulk_analysis_domains 
        ADD COLUMN suggested_target_url TEXT,
        ADD COLUMN target_match_data JSONB,
        ADD COLUMN target_matched_at TIMESTAMP;
        
        CREATE INDEX idx_bulk_analysis_domains_target_matched_at 
        ON bulk_analysis_domains(target_matched_at) 
        WHERE target_matched_at IS NOT NULL;
    END IF;
END $$;

INSERT INTO migrations (name, applied_at) 
VALUES ('0060_add_target_url_matching', NOW())
ON CONFLICT (name) DO NOTHING;

-- Workflow Completion Tracking
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_url TEXT;

CREATE INDEX IF NOT EXISTS idx_workflows_completed_at ON workflows(completed_at);
CREATE INDEX IF NOT EXISTS idx_workflows_delivered_at ON workflows(delivered_at);

INSERT INTO migrations (name, applied_at) 
VALUES ('0062_add_workflow_completion_tracking', NOW())
ON CONFLICT (name) DO NOTHING;

-- Order Completion Tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

INSERT INTO migrations (name, applied_at) 
VALUES ('0065_add_order_completion_tracking', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Completion
-- =========================================================================
COMMIT;

-- =========================================================================
-- Verification
-- =========================================================================
\echo ''
\echo '==================== VERIFICATION ===================='

-- Check if duplicates were cleaned
SELECT CASE 
    WHEN COUNT(*) = 0 THEN '✅ No duplicate clients remain'
    ELSE '❌ Still have ' || COUNT(*) || ' duplicate client IDs'
END as duplicate_cleanup_status
FROM (
    SELECT id FROM clients GROUP BY id HAVING COUNT(*) > 1
) dupes;

-- Check brand intelligence table
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_brand_intelligence')
    THEN '✅ Brand Intelligence table created successfully'
    ELSE '❌ Brand Intelligence table NOT created'
END as brand_intelligence_status;

-- Check if clients table now has primary key
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'clients'::regclass AND contype = 'p')
    THEN '✅ Clients table has primary key'
    ELSE '❌ Clients table still missing primary key'
END as clients_pk_status;

-- Show applied migrations
SELECT '✅ Applied: ' || name as migration_status
FROM migrations 
WHERE name IN (
    '0060_add_target_url_matching',
    '0062_add_workflow_completion_tracking',
    '0065_add_order_completion_tracking',
    '0068_add_client_brand_intelligence',
    '0069_add_brand_intelligence_metadata'
)
ORDER BY name;

\echo '======================================================'
\echo 'Migration completed! Check results above.'
\echo ''