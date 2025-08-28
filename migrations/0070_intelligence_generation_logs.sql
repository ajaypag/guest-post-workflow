-- Create intelligence_generation_logs table for audit trail of all intelligence generation attempts
-- This preserves complete history of research and brief generation attempts

CREATE TABLE IF NOT EXISTS intelligence_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was attempted
  target_page_id UUID NOT NULL REFERENCES target_pages(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL, -- 'research' | 'brief' | 'cancel'
  openai_session_id TEXT, -- The OpenAI session ID if started
  
  -- When it happened
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- What happened
  status VARCHAR(50) NOT NULL, -- 'started' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'auto_recovered'
  error_message TEXT,
  error_details JSONB,
  
  -- Who did it
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  user_type VARCHAR(20), -- 'internal' | 'account'
  
  -- What was produced (if successful)
  output_size INTEGER, -- Size of research/brief output in characters
  tokens_used INTEGER, -- If we track token usage
  
  -- Additional context
  metadata JSONB, -- Additional context like recovery info, retry count, etc
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_target_page_logs ON intelligence_generation_logs(target_page_id, created_at DESC);
CREATE INDEX idx_status_logs ON intelligence_generation_logs(status, created_at DESC);
CREATE INDEX idx_in_progress_logs ON intelligence_generation_logs(status, started_at) WHERE status = 'in_progress';

-- Add comment to table
COMMENT ON TABLE intelligence_generation_logs IS 'Audit log for all target page intelligence generation attempts, preserving complete history';
COMMENT ON COLUMN intelligence_generation_logs.session_type IS 'Type of session: research (initial analysis), brief (final generation), or cancel (user cancelled)';
COMMENT ON COLUMN intelligence_generation_logs.status IS 'Current status: started, in_progress, completed, failed, cancelled, timeout, or auto_recovered';
COMMENT ON COLUMN intelligence_generation_logs.output_size IS 'Size of generated content in characters (for successful completions)';
COMMENT ON COLUMN intelligence_generation_logs.metadata IS 'Additional context: retry attempts, recovery info, cancellation reason, etc';