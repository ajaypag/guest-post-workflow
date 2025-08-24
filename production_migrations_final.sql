-- =========================================================================
-- Production Migrations - August 23, 2024 (FINAL - TESTED)
-- =========================================================================
-- ✅ Successfully tested against production backup: pg-dump-postgres-1755992650.dmp
-- ✅ Ready for production deployment
-- Note: Production already has primary key on clients table (no duplicates found)
-- =========================================================================

BEGIN;

-- =========================================================================
-- Ensure clients table has primary key (if not already present)
-- =========================================================================
DO $$ 
BEGIN
    -- Check if clients has a primary key, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'clients'::regclass 
        AND contype = 'p'
    ) THEN
        ALTER TABLE clients ADD PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key to clients table';
    ELSE
        RAISE NOTICE 'Clients table already has primary key';
    END IF;
END $$;

-- =========================================================================
-- Migration 0068: Add Client Brand Intelligence
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
  
  -- Metadata
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

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0068_add_client_brand_intelligence', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0069: Add Brand Intelligence Metadata
-- =========================================================================
ALTER TABLE client_brand_intelligence 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS client_brand_intelligence_metadata_answer_token_idx 
ON client_brand_intelligence USING gin ((metadata->'answerToken'));

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0069_add_brand_intelligence_metadata', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0060: Add Target URL Matching
-- =========================================================================
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
        
        RAISE NOTICE 'Added target URL matching columns';
    ELSE
        RAISE NOTICE 'Target URL matching columns already exist';
    END IF;
END $$;

INSERT INTO migrations (name, applied_at) 
VALUES ('0060_add_target_url_matching', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0062: Add Workflow Completion Tracking
-- =========================================================================
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

-- =========================================================================
-- Migration 0065: Add Order Completion Tracking
-- =========================================================================
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
-- Verification (Run these after COMMIT)
-- =========================================================================
\echo ''
\echo '==================== VERIFICATION ===================='

-- Check if clients table has primary key
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'clients'::regclass AND contype = 'p')
    THEN '✅ Clients table has primary key'
    ELSE '❌ Clients table missing primary key'
END as clients_pk_status;

-- Check brand intelligence table
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_brand_intelligence')
    THEN '✅ Brand Intelligence table created'
    ELSE '❌ Brand Intelligence table NOT created'
END as brand_intelligence_status;

-- Check metadata column
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'client_brand_intelligence' 
                 AND column_name = 'metadata')
    THEN '✅ Metadata column added'
    ELSE '❌ Metadata column NOT added'
END as metadata_status;

-- Check target URL matching columns
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bulk_analysis_domains' 
                 AND column_name = 'suggested_target_url')
    THEN '✅ Target URL matching columns added'
    ELSE '❌ Target URL matching columns NOT added'
END as target_url_status;

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