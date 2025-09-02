-- Add fields to track which offering and publisher provided the price
-- This is critical for publisher attribution in the order system

ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS selected_offering_id UUID,
ADD COLUMN IF NOT EXISTS selected_publisher_id UUID,
ADD COLUMN IF NOT EXISTS selected_at TIMESTAMP;

-- Add comments to document the fields
COMMENT ON COLUMN websites.selected_offering_id IS 'The offering that was selected to provide the current guest_post_cost (for min/max strategies)';
COMMENT ON COLUMN websites.selected_publisher_id IS 'The publisher who owns the selected offering';
COMMENT ON COLUMN websites.selected_at IS 'When the offering was selected/price was calculated';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_websites_selected_offering ON websites(selected_offering_id);
CREATE INDEX IF NOT EXISTS idx_websites_selected_publisher ON websites(selected_publisher_id);

-- Add foreign key constraints (optional, can be removed if causes issues)
ALTER TABLE websites 
ADD CONSTRAINT fk_websites_selected_offering 
FOREIGN KEY (selected_offering_id) 
REFERENCES publisher_offerings(id) 
ON DELETE SET NULL;

ALTER TABLE websites 
ADD CONSTRAINT fk_websites_selected_publisher 
FOREIGN KEY (selected_publisher_id) 
REFERENCES publishers(id) 
ON DELETE SET NULL;