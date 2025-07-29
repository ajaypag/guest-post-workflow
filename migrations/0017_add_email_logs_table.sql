-- Create email logs table for tracking all email activity
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email details
  type VARCHAR(50) NOT NULL, -- welcome, password-reset, workflow-completed, etc.
  recipients TEXT[] NOT NULL, -- Array of recipient emails
  subject VARCHAR(255) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL, -- sent, failed, queued
  sent_at TIMESTAMP,
  error TEXT,
  
  -- Resend integration
  resend_id VARCHAR(255), -- Resend's email ID for tracking
  
  -- Metadata
  metadata JSONB, -- Additional email data (from, cc, bcc, attachments info, etc.)
  
  -- User tracking
  sent_by UUID REFERENCES users(id), -- Who triggered the email
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_email_logs_type ON email_logs(type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_recipients ON email_logs USING GIN(recipients);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE email_logs IS 'Tracks all email sending activity through Resend';