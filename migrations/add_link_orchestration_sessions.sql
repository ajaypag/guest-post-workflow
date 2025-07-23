-- Create link_orchestration_sessions table
CREATE TABLE IF NOT EXISTS link_orchestration_sessions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Agent results (JSONB for flexibility)
    internal_links_result JSONB,
    client_mention_result JSONB,
    client_link_result JSONB,
    images_result JSONB,
    link_requests_result JSONB,
    url_suggestion_result JSONB,
    
    -- Final merged content
    final_content TEXT,
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for workflow lookups
CREATE INDEX idx_link_orchestration_sessions_workflow_id ON link_orchestration_sessions(workflow_id);

-- Create index for status queries
CREATE INDEX idx_link_orchestration_sessions_status ON link_orchestration_sessions(status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_link_orchestration_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_link_orchestration_sessions_updated_at
    BEFORE UPDATE ON link_orchestration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_link_orchestration_sessions_updated_at();