-- Remove foreign key constraint to allow both users and accounts to reset passwords
ALTER TABLE password_reset_tokens 
DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;

-- Add a comment to explain the user_id column now references either users.id or accounts.id
COMMENT ON COLUMN password_reset_tokens.user_id IS 'References either users.id (for internal users) or accounts.id (for account users) based on user_type';