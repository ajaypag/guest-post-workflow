-- Migration: Add email qualification tracking and source email references
-- This enables the V2 email parser to qualify emails before creating publishers
-- and track the source of pricing information for audit trails

-- Enhance email_processing_logs for qualification tracking
ALTER TABLE email_processing_logs 
ADD COLUMN qualification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN disqualification_reason VARCHAR(100);

-- Add index for qualification queries
CREATE INDEX idx_email_logs_qualification_status ON email_processing_logs(qualification_status);

-- Enhance publisher_offerings for source email tracking  
ALTER TABLE publisher_offerings 
ADD COLUMN source_email_id UUID REFERENCES email_processing_logs(id),
ADD COLUMN source_email_content TEXT,
ADD COLUMN pricing_extracted_from TEXT;

-- Add index for source email lookups
CREATE INDEX idx_publisher_offerings_source_email ON publisher_offerings(source_email_id);

-- Update existing parsed emails to have qualification status
-- (They were created before qualification logic, so mark as processed)
UPDATE email_processing_logs 
SET qualification_status = 'legacy_processed' 
WHERE status = 'parsed';

-- Add comments for documentation
COMMENT ON COLUMN email_processing_logs.qualification_status IS 'Status: pending, qualified, disqualified, legacy_processed';
COMMENT ON COLUMN email_processing_logs.disqualification_reason IS 'Reason: link_swap, no_pricing, rejection, vague_response, etc.';
COMMENT ON COLUMN publisher_offerings.source_email_id IS 'Reference to the email that provided the pricing information';
COMMENT ON COLUMN publisher_offerings.source_email_content IS 'Copy of the email content for audit trail';
COMMENT ON COLUMN publisher_offerings.pricing_extracted_from IS 'Specific quote/text that contained the pricing information';