-- Add unique constraint for bulk_analysis_domains to support upsert operations
-- This fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Drop the existing non-unique index first (if it exists)
DROP INDEX IF EXISTS idx_bulk_domains_client_domain;

-- Add unique constraint on (client_id, domain)
-- This allows ON CONFLICT (client_id, domain) DO UPDATE operations
ALTER TABLE bulk_analysis_domains
ADD CONSTRAINT bulk_analysis_domains_client_domain_unique 
UNIQUE (client_id, domain);

-- Recreate the index for performance (unique constraint creates an index automatically, but naming it explicitly)
-- The unique constraint above already creates an index, so we don't need a separate one