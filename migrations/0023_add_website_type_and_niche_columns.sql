-- Add website_type and niche columns to websites table
-- Website Type: SaaS, Blog, News, eCommerce, etc.  
-- Niche: Multiple niches per website

ALTER TABLE websites ADD COLUMN IF NOT EXISTS website_type TEXT[];
ALTER TABLE websites ADD COLUMN IF NOT EXISTS niche TEXT[];

-- Add indexes for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_websites_website_type ON websites USING GIN(website_type);
CREATE INDEX IF NOT EXISTS idx_websites_niche ON websites USING GIN(niche);