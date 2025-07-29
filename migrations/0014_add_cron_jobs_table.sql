-- Create cron jobs table for scheduled tasks
CREATE TABLE IF NOT EXISTS cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'airtable_sync', 'cleanup', etc.
  schedule VARCHAR(100) NOT NULL, -- cron expression
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  last_run_status VARCHAR(50), -- 'success', 'failed', 'running'
  last_run_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for finding due jobs
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at) WHERE enabled = true;

-- Insert default Airtable sync job
INSERT INTO cron_jobs (name, type, schedule, next_run_at)
VALUES (
  'Daily Airtable Sync',
  'airtable_sync',
  '0 2 * * *', -- 2 AM daily
  CURRENT_TIMESTAMP + INTERVAL '1 day'
) ON CONFLICT DO NOTHING;