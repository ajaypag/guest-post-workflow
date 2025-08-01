-- Add normalized_url column to target_pages table
ALTER TABLE target_pages 
ADD COLUMN normalized_url VARCHAR(500);

-- Create index for faster lookups and duplicate checking
CREATE INDEX idx_target_pages_normalized_url ON target_pages(normalized_url);

-- Create index for client + normalized URL combination for efficient duplicate checking
CREATE INDEX idx_target_pages_client_normalized_url ON target_pages(client_id, normalized_url);