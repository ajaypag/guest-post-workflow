-- Add archivedAt field to clients table for soft delete functionality
ALTER TABLE clients 
ADD COLUMN "archived_at" TIMESTAMP;

-- Add index for performance when filtering non-archived clients
CREATE INDEX idx_clients_archived_at ON clients(archived_at);

-- Add archivedBy field to track who archived the client
ALTER TABLE clients 
ADD COLUMN "archived_by" UUID REFERENCES users(id);

-- Add archiveReason field for audit trail
ALTER TABLE clients 
ADD COLUMN "archive_reason" TEXT;