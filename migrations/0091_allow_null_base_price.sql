-- Allow NULL base_price for offerings where price is not yet known
-- This differentiates from $0 which means free (e.g., link exchanges)

ALTER TABLE publisher_offerings 
ALTER COLUMN base_price DROP NOT NULL;

-- Add comment to clarify the semantics
COMMENT ON COLUMN publisher_offerings.base_price IS 
'Price in cents. NULL = price unknown (needs_info), 0 = free service, >0 = paid service';