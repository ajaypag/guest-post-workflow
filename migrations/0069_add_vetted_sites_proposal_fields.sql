-- Add video and message fields for vetted sites request sharing
ALTER TABLE vetted_sites_requests 
ADD COLUMN proposal_video_url TEXT,
ADD COLUMN proposal_message TEXT;