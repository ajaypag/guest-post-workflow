-- Add onboarding tracking fields to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Create index for onboarding status
CREATE INDEX IF NOT EXISTS idx_accounts_onboarding ON accounts(onboarding_completed);