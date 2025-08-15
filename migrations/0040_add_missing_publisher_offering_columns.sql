-- Migration: Add missing columns to publisher_offerings table
-- Date: 2025-08-14
-- Purpose: Add currency, currentAvailability, and express pricing columns that are used in the application

BEGIN;

-- Add currency column
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS currency varchar(10) DEFAULT 'USD' NOT NULL;

-- Add current_availability column  
ALTER TABLE publisher_offerings
ADD COLUMN IF NOT EXISTS current_availability varchar(50) DEFAULT 'available' NOT NULL;

-- Add express pricing columns
ALTER TABLE publisher_offerings
ADD COLUMN IF NOT EXISTS express_available boolean DEFAULT false;

ALTER TABLE publisher_offerings
ADD COLUMN IF NOT EXISTS express_price integer DEFAULT NULL;

ALTER TABLE publisher_offerings
ADD COLUMN IF NOT EXISTS express_days integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN publisher_offerings.currency IS 'Currency code for pricing (USD, EUR, etc.)';
COMMENT ON COLUMN publisher_offerings.current_availability IS 'Current availability status (available, limited, unavailable)';
COMMENT ON COLUMN publisher_offerings.express_available IS 'Whether express service is available';
COMMENT ON COLUMN publisher_offerings.express_price IS 'Express service price in cents';
COMMENT ON COLUMN publisher_offerings.express_days IS 'Days for express delivery';

COMMIT;