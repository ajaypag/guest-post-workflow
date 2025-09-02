-- Add campaign import tracking table
CREATE TABLE IF NOT EXISTS manyreach_campaign_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(500),
  
  -- Import statistics
  last_import_at TIMESTAMP NOT NULL DEFAULT NOW(),
  total_prospects INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_imported INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  
  -- Tracking new replies
  last_check_at TIMESTAMP,
  new_replies_since_check INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(workspace_name, campaign_id)
);

-- Add index for quick lookups
CREATE INDEX idx_campaign_imports_workspace ON manyreach_campaign_imports(workspace_name);
CREATE INDEX idx_campaign_imports_last_import ON manyreach_campaign_imports(last_import_at);

-- Add ignore list for emails
CREATE TABLE IF NOT EXISTS manyreach_ignored_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255),
  workspace_name VARCHAR(255),
  
  -- Reason for ignoring
  ignore_reason VARCHAR(500),
  ignored_by UUID REFERENCES users(id),
  
  -- Allow ignoring globally or per campaign
  scope VARCHAR(50) DEFAULT 'campaign', -- 'global' or 'campaign'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint - can't ignore same email twice for same scope
  UNIQUE(email, campaign_id, workspace_name)
);

-- Add indexes for ignore list
CREATE INDEX idx_ignored_emails_email ON manyreach_ignored_emails(email);
CREATE INDEX idx_ignored_emails_campaign ON manyreach_ignored_emails(campaign_id);

-- Add comment
COMMENT ON TABLE manyreach_campaign_imports IS 'Tracks import history and statistics for ManyReach campaigns';
COMMENT ON TABLE manyreach_ignored_emails IS 'List of emails to ignore during ManyReach imports';

-- Add ignore status to email_processing_logs
ALTER TABLE email_processing_logs 
ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN DEFAULT FALSE;

-- Add index for ignored emails
CREATE INDEX IF NOT EXISTS idx_email_logs_ignored ON email_processing_logs(is_ignored) WHERE is_ignored = TRUE;