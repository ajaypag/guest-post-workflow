-- Add target_page_id column to order_items table for bulk analysis integration
ALTER TABLE order_items 
ADD COLUMN target_page_id UUID;

-- Add index for better query performance
CREATE INDEX idx_order_items_target_page_id ON order_items(target_page_id);

-- Add comment explaining the column
COMMENT ON COLUMN order_items.target_page_id IS 'References the target page selected for this domain from the client target pages';