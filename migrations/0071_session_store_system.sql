-- Migration: Session Store System for Proper Impersonation
-- Created: 2025-08-24
-- Description: Implements single session store architecture to replace cookie proliferation

-- Create the sessions table for storing user session state
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at) WHERE expires_at > NOW();

-- Create impersonation logs table (improved from first iteration)
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL,
  target_user_type VARCHAR(20) NOT NULL CHECK (target_user_type IN ('account', 'publisher')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  ip_address INET,
  user_agent TEXT,
  actions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for impersonation logs
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin ON impersonation_logs(admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_active ON impersonation_logs(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_session ON impersonation_logs(session_id);

-- Create impersonation actions table for audit trail
CREATE TABLE IF NOT EXISTS impersonation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES impersonation_logs(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_data JSONB,
  response_status INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for action lookups
CREATE INDEX IF NOT EXISTS idx_impersonation_actions_log ON impersonation_actions(log_id, timestamp DESC);

-- Function to automatically expire old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM user_sessions WHERE expires_at <= NOW();
  
  -- Mark impersonation logs as expired if their sessions are gone
  UPDATE impersonation_logs 
  SET status = 'expired', ended_at = NOW() 
  WHERE status = 'active' 
    AND session_id NOT IN (SELECT id FROM user_sessions);
END;
$$ LANGUAGE plpgsql;

-- Create a simple trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_impersonation_logs_updated_at ON impersonation_logs;
CREATE TRIGGER update_impersonation_logs_updated_at
    BEFORE UPDATE ON impersonation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_sessions IS 'Single session store replacing multiple auth cookies';
COMMENT ON TABLE impersonation_logs IS 'Audit log for all impersonation sessions with proper security tracking';
COMMENT ON TABLE impersonation_actions IS 'Detailed action log for impersonation sessions';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Maintenance function to clean up expired sessions and logs';