-- Create webhook_security_logs table for tracking webhook requests
CREATE TABLE IF NOT EXISTS webhook_security_logs (
    id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    signature_valid BOOLEAN DEFAULT false,
    signature_provided VARCHAR(255),
    timestamp_valid BOOLEAN DEFAULT false,
    ip_allowed BOOLEAN DEFAULT false,
    rate_limit_key VARCHAR(255),
    requests_in_window INTEGER DEFAULT 1,
    allowed BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_webhook_id ON webhook_security_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_ip_address ON webhook_security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created_at ON webhook_security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_allowed ON webhook_security_logs(allowed);

-- Add composite index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_rate_limit 
    ON webhook_security_logs(rate_limit_key, created_at DESC);