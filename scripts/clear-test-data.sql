-- Clear test data for ManyReach import testing
-- This deletes the imported email and any related drafts

-- First delete publisher drafts (foreign key constraint)
DELETE FROM publisher_drafts 
WHERE email_log_id IN (
    SELECT id FROM email_processing_logs 
    WHERE email_from = 'editor@littlegatepublishing.com' 
    OR campaign_id = '26001'
);

-- Then delete the email processing logs
DELETE FROM email_processing_logs 
WHERE email_from = 'editor@littlegatepublishing.com' 
OR campaign_id = '26001';

-- For the specific campaign, also clear just the imported status
-- so we can test re-importing
UPDATE email_processing_logs 
SET import_status = NULL
WHERE campaign_id = '26001' AND import_status = 'imported';