-- Add missing fields for publisher email claims
-- These fields track how confident we are about the claim and where the match came from

ALTER TABLE publisher_email_claims 
ADD COLUMN IF NOT EXISTS claim_confidence VARCHAR(50),
ADD COLUMN IF NOT EXISTS claim_source VARCHAR(100);

-- Update existing claims with default values if needed
UPDATE publisher_email_claims 
SET claim_confidence = 'unknown', 
    claim_source = 'manual'
WHERE claim_confidence IS NULL;