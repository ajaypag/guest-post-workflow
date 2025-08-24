-- Create migration history table for tracking applied migrations
-- This is the first migration that bootstraps the migration system

CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  hash VARCHAR(64),
  applied_at TIMESTAMP DEFAULT NOW(),
  executed_by VARCHAR(255),
  execution_time_ms INTEGER,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  rollback_sql TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migration_history_filename ON migration_history(filename);
CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON migration_history(applied_at DESC);

-- Add a comment to the table
COMMENT ON TABLE migration_history IS 'Tracks all database migrations applied to this database';
COMMENT ON COLUMN migration_history.filename IS 'The migration file name';
COMMENT ON COLUMN migration_history.name IS 'Human-readable name of the migration';
COMMENT ON COLUMN migration_history.hash IS 'SHA-256 hash of the migration file for integrity checking';
COMMENT ON COLUMN migration_history.applied_at IS 'Timestamp when the migration was applied';
COMMENT ON COLUMN migration_history.executed_by IS 'User who executed the migration';
COMMENT ON COLUMN migration_history.execution_time_ms IS 'Time taken to execute the migration in milliseconds';
COMMENT ON COLUMN migration_history.status IS 'Status of the migration: success, failed, rolled_back';
COMMENT ON COLUMN migration_history.error_message IS 'Error message if the migration failed';
COMMENT ON COLUMN migration_history.rollback_sql IS 'SQL to rollback this migration if needed';