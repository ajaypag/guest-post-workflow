-- Migration: Add NOT NULL constraint to clients.website column
-- Date: 2025-08-26
-- Purpose: Ensure all clients have a website URL to prevent duplicates and maintain data integrity

-- Step 1: Update all NULL or empty website values with placeholder URLs based on client names
UPDATE clients 
SET website = 
  CASE 
    -- Specific known websites for some clients
    WHEN name = 'Sky2c Logistics' THEN 'https://sky2c.com'
    WHEN name = 'Linkio' THEN 'https://linkio.com'
    WHEN name = 'Agenticbuilders' THEN 'https://agenticbuilders.com'
    WHEN name = 'Vowtobechic' THEN 'https://vowtobechic.com'
    WHEN name = 'Rimfinancing' THEN 'https://rimfinancing.com'
    WHEN name = 'Factbites' THEN 'https://factbites.com'
    WHEN name = 'Drew Stevens Consulting' THEN 'https://drewstevensconsulting.com'
    WHEN name = 'Dreamksa25' THEN 'https://dreamksa25.com'
    WHEN name = 'Greenseopoint' THEN 'https://greenseopoint.com'
    WHEN name = 'Loanify' THEN 'https://loanify.com'
    WHEN name = 'Hotsuit' THEN 'https://hotsuit.com'
    WHEN name = 'Financialdocs' THEN 'https://financialdocs.com'
    WHEN name = 'Growthshiner' THEN 'https://growthshiner.com'
    WHEN name = 'Mbbsdirect' THEN 'https://mbbsdirect.com'
    WHEN name = 'Worldcrunch' THEN 'https://worldcrunch.com'
    WHEN name = 'Vpwealth' THEN 'https://vpwealth.com'
    WHEN name = 'Foreverpostal' THEN 'https://foreverpostal.com'
    -- Generic placeholder for any others
    ELSE 'https://' || lower(regexp_replace(name, '\\s+', '', 'g')) || '.com'
  END
WHERE website IS NULL OR website = '';

-- Step 2: Add NOT NULL constraint to website column
ALTER TABLE clients 
ALTER COLUMN website SET NOT NULL;

-- Step 3: Add a check constraint to ensure website is not empty string
ALTER TABLE clients 
ADD CONSTRAINT clients_website_not_empty CHECK (website != '');

-- Step 4: Create an index on website for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_clients_website ON clients(website);

-- Step 5: Log the migration (only if migration_history table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_history') THEN
        INSERT INTO migration_history (migration_name, executed_at, status, notes)
        VALUES ('0072_add_website_not_null_constraint', NOW(), 'completed', 'Added NOT NULL constraint to clients.website column and filled empty values');
    END IF;
END $$;