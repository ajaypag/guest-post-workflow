-- Create tables for tracking ManyReach validation runs and their results
-- This provides audit trail, history, and resumability for email validation processes

-- Main validation runs table - tracks each time validation is triggered
CREATE TABLE manyreach_validation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    total_workspaces INTEGER DEFAULT 0,
    workspaces_processed INTEGER DEFAULT 0,
    total_campaigns INTEGER DEFAULT 0,
    campaigns_processed INTEGER DEFAULT 0,
    total_new_replies INTEGER DEFAULT 0,
    unique_campaigns INTEGER DEFAULT 0,
    duplicate_campaigns INTEGER DEFAULT 0,
    processing_time_seconds INTEGER,
    triggered_by_user_id UUID, -- references users table but no FK constraint
    trigger_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'scheduled', 'api'
    run_summary JSONB, -- detailed results and metadata
    error_message TEXT, -- if status = 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual campaign validation results - tracks each campaign processed in a run
CREATE TABLE manyreach_campaign_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_run_id UUID NOT NULL REFERENCES manyreach_validation_runs(id) ON DELETE CASCADE,
    workspace_name VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500),
    total_prospects INTEGER DEFAULT 0,
    replied_prospects INTEGER DEFAULT 0,
    real_replies_found INTEGER DEFAULT 0,
    already_imported INTEGER DEFAULT 0,
    prospects_checked INTEGER DEFAULT 0,
    processing_time_seconds INTEGER,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'failed', 'skipped'
    error_message TEXT, -- if status = 'failed'
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of VARCHAR(255), -- reference to the primary campaign
    campaign_metadata JSONB, -- store additional campaign details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_manyreach_validation_runs_started_at ON manyreach_validation_runs(started_at DESC);
CREATE INDEX idx_manyreach_validation_runs_status ON manyreach_validation_runs(status);
CREATE INDEX idx_manyreach_validation_runs_user ON manyreach_validation_runs(triggered_by_user_id);

CREATE INDEX idx_manyreach_campaign_validations_run_id ON manyreach_campaign_validations(validation_run_id);
CREATE INDEX idx_manyreach_campaign_validations_workspace ON manyreach_campaign_validations(workspace_name);
CREATE INDEX idx_manyreach_campaign_validations_campaign ON manyreach_campaign_validations(campaign_id);
CREATE INDEX idx_manyreach_campaign_validations_validated_at ON manyreach_campaign_validations(validated_at DESC);

-- Comments for documentation
COMMENT ON TABLE manyreach_validation_runs IS 'Tracks each ManyReach validation run with timing, results, and metadata';
COMMENT ON TABLE manyreach_campaign_validations IS 'Detailed results for each campaign processed during a validation run';

COMMENT ON COLUMN manyreach_validation_runs.status IS 'Current status: running, completed, failed, cancelled';
COMMENT ON COLUMN manyreach_validation_runs.run_summary IS 'JSON object containing final results, workspace list, campaign details, etc.';
COMMENT ON COLUMN manyreach_campaign_validations.real_replies_found IS 'Number of prospects with actual REPLY messages (not just ManyReach replied flag)';
COMMENT ON COLUMN manyreach_campaign_validations.prospects_checked IS 'Number of prospects actually validated for real replies';