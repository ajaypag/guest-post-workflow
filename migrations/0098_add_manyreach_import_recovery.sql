-- Create manyreach_import_recovery table for resumable imports
CREATE TABLE IF NOT EXISTS manyreach_import_recovery (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  workspace VARCHAR(255) NOT NULL,
  last_processed_email VARCHAR(255),
  processed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  failed_emails TEXT DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'failed', 'completed')),
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id, workspace)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_import_recovery_status 
ON manyreach_import_recovery (status, workspace);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_import_recovery_updated 
ON manyreach_import_recovery (updated_at);

-- Add comment
COMMENT ON TABLE manyreach_import_recovery IS 'Tracks ManyReach import progress for error recovery and resume capability';