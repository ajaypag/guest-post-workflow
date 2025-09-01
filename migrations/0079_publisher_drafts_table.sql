-- Create publisher_drafts table for ManyReach V3 import system
CREATE TABLE IF NOT EXISTS publisher_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_processing_logs(id) ON DELETE CASCADE,
  
  -- Extracted data (stored as JSON for flexibility)
  parsed_data JSONB NOT NULL DEFAULT '{}',
  
  -- Draft management
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewing, approved, rejected
  edited_data JSONB, -- User's edits overlay on parsed_data
  
  -- Review tracking
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- If approved, link to created records
  publisher_id UUID REFERENCES publishers(id),
  website_id UUID REFERENCES websites(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_drafts_status ON publisher_drafts(status);
CREATE INDEX idx_drafts_created ON publisher_drafts(created_at DESC);
CREATE INDEX idx_drafts_email_log ON publisher_drafts(email_log_id);

-- Add import tracking to email_processing_logs
ALTER TABLE email_processing_logs 
ADD COLUMN IF NOT EXISTS import_status VARCHAR(50) DEFAULT 'not_imported';
-- import_status: not_imported, imported, skipped, error

COMMENT ON TABLE publisher_drafts IS 'Draft publisher records from ManyReach email imports awaiting review';
COMMENT ON COLUMN publisher_drafts.parsed_data IS 'AI-extracted data from email';
COMMENT ON COLUMN publisher_drafts.edited_data IS 'User edits that override parsed_data';
COMMENT ON COLUMN publisher_drafts.status IS 'Draft review status: pending, reviewing, approved, rejected';