-- Add proposal video and message fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS proposal_video_url TEXT,
ADD COLUMN IF NOT EXISTS proposal_message TEXT;