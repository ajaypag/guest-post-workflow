-- Create table for storing ManyReach API keys securely
CREATE TABLE IF NOT EXISTS manyreach_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name VARCHAR(255) NOT NULL UNIQUE,
  workspace_id VARCHAR(255), -- ManyReach workspace ID if available
  api_key_encrypted TEXT NOT NULL, -- Encrypted API key
  campaign_mappings JSONB DEFAULT '{}', -- Map campaign names to IDs
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX idx_manyreach_workspace_active ON manyreach_api_keys(workspace_name, is_active);

-- Add comment
COMMENT ON TABLE manyreach_api_keys IS 'Stores encrypted ManyReach API keys for different workspaces';
COMMENT ON COLUMN manyreach_api_keys.api_key_encrypted IS 'API key encrypted using application-level encryption';