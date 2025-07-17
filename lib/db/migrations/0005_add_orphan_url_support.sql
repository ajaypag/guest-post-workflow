-- Migration: Add support for orphan URLs and workflow-scoped URLs
-- This allows URLs to exist without a client association for temporary campaigns

-- Make clientId nullable to support orphan URLs
ALTER TABLE target_pages 
  ALTER COLUMN client_id DROP NOT NULL;

-- Add new columns for orphan URL management
ALTER TABLE target_pages
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES workflows(id),
  ADD COLUMN IF NOT EXISTS source_type varchar(50) DEFAULT 'client_managed',
  ADD COLUMN IF NOT EXISTS created_in_workflow boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamp;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_target_pages_orphan 
  ON target_pages (owner_user_id) 
  WHERE client_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_target_pages_workflow 
  ON target_pages (workflow_id) 
  WHERE client_id IS NULL;

-- Add check constraint for source types
ALTER TABLE target_pages 
  ADD CONSTRAINT chk_source_type 
  CHECK (source_type IN ('client_managed', 'workflow_temporary', 'bulk_import', 'user_orphan'));

-- Add comments for documentation
COMMENT ON COLUMN target_pages.owner_user_id IS 'User who owns orphan URLs (when client_id is NULL)';
COMMENT ON COLUMN target_pages.workflow_id IS 'Associated workflow for temporary URLs';
COMMENT ON COLUMN target_pages.source_type IS 'How the URL was added: client_managed, workflow_temporary, bulk_import, user_orphan';
COMMENT ON COLUMN target_pages.created_in_workflow IS 'Whether URL was created during a workflow session';
COMMENT ON COLUMN target_pages.expires_at IS 'When temporary URLs should be cleaned up';