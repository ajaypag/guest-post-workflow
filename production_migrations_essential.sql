-- =========================================================================
-- Essential Production Migrations - August 23, 2024
-- =========================================================================
-- Focus: Brand Intelligence System and Workflow Tracking
-- =========================================================================

BEGIN;

-- =========================================================================
-- Migration 0068: Add Client Brand Intelligence
-- =========================================================================
-- Create client_brand_intelligence table for AI-powered brand research
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

-- Add comments for documentation
COMMENT ON TABLE client_brand_intelligence IS 'Stores AI-powered brand research and intelligence briefs for clients';
COMMENT ON COLUMN client_brand_intelligence.research_session_id IS 'OpenAI Deep Research session ID for tracking long-running operations';
COMMENT ON COLUMN client_brand_intelligence.research_status IS 'Status of deep research phase: idle, queued, in_progress, completed, error';
COMMENT ON COLUMN client_brand_intelligence.research_output IS 'Complete research results including analysis and identified gaps in JSON format';
COMMENT ON COLUMN client_brand_intelligence.client_input IS 'Client response to research gaps - collected once during input phase';
COMMENT ON COLUMN client_brand_intelligence.brief_session_id IS 'AI agent session ID for brief generation phase';
COMMENT ON COLUMN client_brand_intelligence.brief_status IS 'Status of brief generation: idle, queued, in_progress, completed, error';
COMMENT ON COLUMN client_brand_intelligence.final_brief IS 'AI-generated comprehensive brand brief for content creation';

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0068_add_client_brand_intelligence', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0069: Add Brand Intelligence Metadata
-- =========================================================================
-- Add metadata column for storing email tokens and structured answers
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
-- Migration 0063: Add Workflow Assignment Tracking (if needed)
-- =========================================================================
-- Create workflow_assignments table for tracking user assignments
CREATE TABLE IF NOT EXISTS workflow_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    unassigned_at TIMESTAMP,
    unassigned_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_workflow_id ON workflow_assignments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_user_id ON workflow_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_status ON workflow_assignments(status);

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0063_add_workflow_assignment_tracking', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0062: Add Workflow Completion Tracking
-- =========================================================================
-- Add columns to track workflow completion and delivery
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_completed_at ON workflows(completed_at);
CREATE INDEX IF NOT EXISTS idx_workflows_delivered_at ON workflows(delivered_at);

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0062_add_workflow_completion_tracking', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0065: Add Order Completion Tracking
-- =========================================================================
-- Add completion tracking fields to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0065_add_order_completion_tracking', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Migration 0060: Add Target URL Matching (Modified for existing columns)
-- =========================================================================
-- Check if columns already exist before adding
DO $$ 
BEGIN
    -- Only add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulk_analysis_domains' 
                   AND column_name = 'suggested_target_url') THEN
        ALTER TABLE bulk_analysis_domains 
        ADD COLUMN suggested_target_url TEXT,
        ADD COLUMN target_match_data JSONB,
        ADD COLUMN target_matched_at TIMESTAMP;
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_target_matched_at 
ON bulk_analysis_domains(target_matched_at) 
WHERE target_matched_at IS NOT NULL;

-- Insert migration record
INSERT INTO migrations (name, applied_at) 
VALUES ('0060_add_target_url_matching', NOW())
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- Completion
-- =========================================================================
COMMIT;

-- =========================================================================
-- Verification Queries (Run after COMMIT)
-- =========================================================================
-- Check what was created
SELECT 'Migration completed successfully!' as status;

-- Check critical tables
SELECT 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'client_brand_intelligence') as brand_intelligence_table,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'client_brand_intelligence' AND column_name = 'metadata') as metadata_column,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_assignments') as workflow_assignments_table;

-- Show applied migrations
SELECT name, applied_at::date as applied_date
FROM migrations 
WHERE name IN (
    '0060_add_target_url_matching',
    '0062_add_workflow_completion_tracking',
    '0063_add_workflow_assignment_tracking',
    '0065_add_order_completion_tracking',
    '0068_add_client_brand_intelligence',
    '0069_add_brand_intelligence_metadata'
)
ORDER BY name;