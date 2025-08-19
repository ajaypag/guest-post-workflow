-- Migration: Email Processing Infrastructure for ManyReach Integration
-- Purpose: Create tables for processing and tracking email responses from publishers
-- Date: 2025-08-18

-- Step 1: Email processing logs for ManyReach webhooks
CREATE TABLE IF NOT EXISTS email_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook identification
  webhook_id VARCHAR(255),
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  campaign_type VARCHAR(50), -- outreach, follow_up, bulk
  
  -- Email metadata
  email_from VARCHAR(255) NOT NULL,
  email_to VARCHAR(255),
  email_subject VARCHAR(500),
  email_message_id VARCHAR(255),
  received_at TIMESTAMP,
  
  -- Content
  raw_content TEXT NOT NULL,
  html_content TEXT,
  
  -- AI parsing results
  parsed_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2),
  parsing_errors TEXT[],
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, parsed, failed, reviewed
  error_message TEXT,
  processed_at TIMESTAMP,
  processing_duration_ms INTEGER,
  
  -- Thread tracking
  thread_id VARCHAR(255),
  reply_count INTEGER DEFAULT 0,
  is_auto_reply BOOLEAN DEFAULT FALSE,
  original_outreach_id UUID REFERENCES email_processing_logs(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Email review queue for manual processing
CREATE TABLE IF NOT EXISTS email_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  log_id UUID REFERENCES email_processing_logs(id) ON DELETE CASCADE,
  publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
  
  -- Queue management
  priority INTEGER DEFAULT 50, -- 0-100, higher = more urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, approved, rejected, auto_approved
  queue_reason VARCHAR(100), -- low_confidence, missing_data, validation_error, manual_request
  
  -- Review data
  suggested_actions JSONB DEFAULT '{}',
  missing_fields TEXT[],
  review_notes TEXT,
  corrections_made JSONB DEFAULT '{}',
  
  -- Assignment tracking
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  auto_approve_at TIMESTAMP, -- For automatic approval after delay
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Publisher automation tracking
CREATE TABLE IF NOT EXISTS publisher_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  email_log_id UUID REFERENCES email_processing_logs(id),
  publisher_id UUID REFERENCES publishers(id),
  
  -- Action tracking
  action VARCHAR(100) NOT NULL, -- created, updated, matched, claimed, status_change
  action_status VARCHAR(50) DEFAULT 'success', -- success, failed, partial
  
  -- Data changes
  previous_data JSONB,
  new_data JSONB,
  fields_updated TEXT[],
  
  -- Confidence and metadata
  confidence DECIMAL(3,2),
  match_method VARCHAR(50), -- email_exact, domain_match, fuzzy_name, manual
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Publisher claim history tracking
CREATE TABLE IF NOT EXISTS publisher_claim_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  publisher_id UUID REFERENCES publishers(id) NOT NULL,
  
  -- Claim details
  action VARCHAR(50) NOT NULL, -- initiate_claim, verify_email, set_password, complete_claim, fail_claim
  success BOOLEAN DEFAULT TRUE,
  failure_reason VARCHAR(255),
  
  -- Security tracking
  ip_address VARCHAR(45),
  user_agent TEXT,
  verification_method VARCHAR(50), -- email_code, token, manual
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Shadow publisher website relationships
CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  publisher_id UUID REFERENCES publishers(id) NOT NULL,
  website_id UUID REFERENCES websites(id) NOT NULL,
  
  -- Confidence and source
  confidence DECIMAL(3,2),
  source VARCHAR(50), -- email_domain, claimed_in_email, manual, inferred
  extraction_method VARCHAR(100), -- ai_extracted, regex_match, manual_entry
  
  -- Verification status
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_shadow_publisher_website UNIQUE(publisher_id, website_id)
);

-- Step 6: Follow-up email tracking
CREATE TABLE IF NOT EXISTS email_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  original_log_id UUID REFERENCES email_processing_logs(id),
  publisher_id UUID REFERENCES publishers(id),
  
  -- Follow-up details
  follow_up_type VARCHAR(50), -- missing_pricing, missing_website, missing_requirements, clarification
  follow_up_number INTEGER DEFAULT 1,
  template_used VARCHAR(100),
  
  -- Email content
  sent_to VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  
  -- Missing data tracking
  missing_fields TEXT[],
  requested_data JSONB DEFAULT '{}',
  
  -- Response tracking
  sent_at TIMESTAMP DEFAULT NOW(),
  response_received_at TIMESTAMP,
  response_log_id UUID REFERENCES email_processing_logs(id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'sent', -- sent, bounced, responded, timeout
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 7: ManyReach webhook security tracking
CREATE TABLE IF NOT EXISTS webhook_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  webhook_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Security validation
  signature_valid BOOLEAN,
  signature_provided VARCHAR(500),
  timestamp_valid BOOLEAN,
  ip_allowed BOOLEAN,
  
  -- Rate limiting
  rate_limit_key VARCHAR(255),
  requests_in_window INTEGER,
  
  -- Result
  allowed BOOLEAN,
  rejection_reason VARCHAR(255),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 8: Add indexes for performance
CREATE INDEX idx_email_logs_webhook_id ON email_processing_logs(webhook_id);
CREATE INDEX idx_email_logs_campaign_id ON email_processing_logs(campaign_id);
CREATE INDEX idx_email_logs_status ON email_processing_logs(status);
CREATE INDEX idx_email_logs_email_from ON email_processing_logs(LOWER(email_from));
CREATE INDEX idx_email_logs_thread_id ON email_processing_logs(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_email_logs_created_at ON email_processing_logs(created_at DESC);

CREATE INDEX idx_review_queue_status ON email_review_queue(status);
CREATE INDEX idx_review_queue_priority ON email_review_queue(priority DESC);
CREATE INDEX idx_review_queue_assigned ON email_review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_review_queue_auto_approve ON email_review_queue(auto_approve_at) WHERE auto_approve_at IS NOT NULL;

CREATE INDEX idx_automation_logs_publisher ON publisher_automation_logs(publisher_id);
CREATE INDEX idx_automation_logs_email ON publisher_automation_logs(email_log_id);
CREATE INDEX idx_automation_logs_action ON publisher_automation_logs(action);
CREATE INDEX idx_automation_logs_created ON publisher_automation_logs(created_at DESC);

CREATE INDEX idx_claim_history_publisher ON publisher_claim_history(publisher_id);
CREATE INDEX idx_claim_history_action ON publisher_claim_history(action);
CREATE INDEX idx_claim_history_created ON publisher_claim_history(created_at DESC);

CREATE INDEX idx_shadow_websites_publisher ON shadow_publisher_websites(publisher_id);
CREATE INDEX idx_shadow_websites_website ON shadow_publisher_websites(website_id);
CREATE INDEX idx_shadow_websites_verified ON shadow_publisher_websites(verified);

CREATE INDEX idx_follow_ups_original ON email_follow_ups(original_log_id);
CREATE INDEX idx_follow_ups_publisher ON email_follow_ups(publisher_id);
CREATE INDEX idx_follow_ups_status ON email_follow_ups(status);

CREATE INDEX idx_webhook_security_created ON webhook_security_logs(created_at DESC);
CREATE INDEX idx_webhook_security_ip ON webhook_security_logs(ip_address);

-- Step 9: Add comments for documentation
COMMENT ON TABLE email_processing_logs IS 'Stores all incoming email responses from ManyReach webhooks';
COMMENT ON TABLE email_review_queue IS 'Queue for manual review of emails that need human intervention';
COMMENT ON TABLE publisher_automation_logs IS 'Audit trail of all automated publisher creation and updates';
COMMENT ON TABLE publisher_claim_history IS 'Security audit trail for publisher account claiming';
COMMENT ON TABLE shadow_publisher_websites IS 'Tracks website associations for unclaimed publishers';
COMMENT ON TABLE email_follow_ups IS 'Tracks automated follow-up emails for missing information';
COMMENT ON TABLE webhook_security_logs IS 'Security audit trail for ManyReach webhook validation';

-- Step 10: Create function for auto-approval processing
CREATE OR REPLACE FUNCTION process_auto_approvals()
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER := 0;
BEGIN
  UPDATE email_review_queue
  SET 
    status = 'auto_approved',
    updated_at = NOW()
  WHERE 
    status = 'pending' 
    AND auto_approve_at IS NOT NULL 
    AND auto_approve_at <= NOW();
  
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  RETURN approved_count;
END;
$$ LANGUAGE plpgsql;