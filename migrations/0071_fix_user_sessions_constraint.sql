-- Fix user_sessions foreign key constraint to allow account users
-- The original constraint only allowed users from the 'users' table,
-- but account users are stored in the 'accounts' table

-- Drop the existing foreign key constraint
ALTER TABLE user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- Remove the foreign key constraint entirely since user_id can reference
-- either users.id, accounts.id, or publishers.id depending on user_type
-- We'll rely on application logic to ensure valid user_ids

-- Note: We're not adding a new constraint because PostgreSQL doesn't support
-- foreign keys that can reference multiple tables. The session manager
-- will validate the user_id exists in the appropriate table based on user_type.

-- Add an index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);