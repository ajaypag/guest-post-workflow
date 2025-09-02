-- Add display_name field to manyreach_api_keys table for UI-friendly names
ALTER TABLE manyreach_api_keys 
ADD COLUMN display_name VARCHAR(255);

-- Add comment
COMMENT ON COLUMN manyreach_api_keys.display_name IS 'User-friendly display name extracted from ManyReach account info';

-- Create index for display name lookups
CREATE INDEX idx_manyreach_display_name ON manyreach_api_keys(display_name);