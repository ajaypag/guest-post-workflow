-- Add missing sender_email column to email_processing_logs
-- This column is needed for tracking email senders in ManyReach webhook processing

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_processing_logs' AND column_name='sender_email') THEN
        ALTER TABLE email_processing_logs ADD COLUMN sender_email VARCHAR(255);
        RAISE NOTICE 'Added sender_email column to email_processing_logs';
    ELSE
        RAISE NOTICE 'sender_email column already exists in email_processing_logs';
    END IF;
END $$;