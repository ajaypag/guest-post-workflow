-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  applied_by VARCHAR(255)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_history_executed ON migration_history(executed_at DESC);

-- Insert this migration as the first entry
INSERT INTO migration_history (migration_name, success) 
VALUES ('0000_create_migrations_table', true)
ON CONFLICT (migration_name) DO NOTHING;