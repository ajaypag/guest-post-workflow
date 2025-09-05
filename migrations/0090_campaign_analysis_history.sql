-- Create campaign_analysis_history table to track when campaigns were analyzed
CREATE TABLE IF NOT EXISTS campaign_analysis_history (
  id SERIAL PRIMARY KEY,
  workspace VARCHAR(255) NOT NULL DEFAULT 'main',
  campaign_id VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(500),
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  analyzed_by UUID REFERENCES users(id),
  total_emails_checked INTEGER DEFAULT 0,
  new_emails_found INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  ignored_emails INTEGER DEFAULT 0,
  campaigns_analyzed TEXT[],
  analysis_type VARCHAR(50) DEFAULT 'manual',
  analysis_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_campaign_analysis_workspace ON campaign_analysis_history (workspace);
CREATE INDEX IF NOT EXISTS idx_campaign_analysis_campaign_id ON campaign_analysis_history (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analysis_analyzed_at ON campaign_analysis_history (analyzed_at DESC);

-- Add lastAnalyzedAt column to existing tables if needed
ALTER TABLE email_processing_logs 
  ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP;

ALTER TABLE publisher_drafts 
  ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP;

-- Create a view for easy campaign status with last analysis
CREATE OR REPLACE VIEW campaign_analysis_status AS
SELECT 
  DISTINCT epl.campaign_name as campaign_id,
  epl.campaign_name,
  cah.workspace,
  MAX(cah.analyzed_at) as last_analyzed_at,
  MAX(cah.new_emails_found) as last_new_emails_found,
  COUNT(DISTINCT epl.email) as total_emails
FROM email_processing_logs epl
LEFT JOIN campaign_analysis_history cah 
  ON cah.campaign_id = epl.campaign_name
GROUP BY epl.campaign_name, cah.workspace;

-- Add comment
COMMENT ON TABLE campaign_analysis_history IS 'Tracks history of campaign analysis runs for ManyReach email imports';