-- Add background_response_id to outline_sessions table for OpenAI background mode
ALTER TABLE outline_sessions 
ADD COLUMN background_response_id VARCHAR(255),
ADD COLUMN polling_attempts INTEGER DEFAULT 0,
ADD COLUMN last_polled_at TIMESTAMP,
ADD COLUMN is_active BOOLEAN DEFAULT FALSE;

-- Add indexes for faster lookups
CREATE INDEX idx_outline_sessions_response_id ON outline_sessions(background_response_id);
CREATE INDEX idx_outline_sessions_active ON outline_sessions(workflow_id, is_active) WHERE is_active = TRUE;