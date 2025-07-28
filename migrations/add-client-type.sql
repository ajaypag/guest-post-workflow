-- Add client_type column to clients table
ALTER TABLE clients ADD COLUMN client_type VARCHAR(50) DEFAULT 'client';

-- Update existing clients to have the correct type
UPDATE clients SET client_type = 'client' WHERE client_type IS NULL;

-- Add index for faster filtering
CREATE INDEX idx_clients_type ON clients(client_type);

-- Add conversion tracking fields
ALTER TABLE clients ADD COLUMN converted_from_prospect_at TIMESTAMP;
ALTER TABLE clients ADD COLUMN conversion_notes TEXT;