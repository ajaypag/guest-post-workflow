-- Add user_type column to password_reset_tokens to distinguish between internal users and account users
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'internal';

-- Update existing tokens to be 'internal' (safe assumption since accounts couldn't reset before)
UPDATE password_reset_tokens 
SET user_type = 'internal' 
WHERE user_type IS NULL;