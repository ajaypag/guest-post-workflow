-- Add metadata column to store account_id for account users
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS metadata JSONB;