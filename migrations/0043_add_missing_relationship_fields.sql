-- Migration: Add missing fields to publisher_offering_relationships
-- Date: 2025-08-15
-- Reason: Complete the publisher_offering_relationships table with all needed fields

-- Add contact information fields
ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50);

ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

-- Add notes fields
ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS publisher_notes TEXT;

-- Add commission/payment fields
ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS commission_rate VARCHAR(50);

ALTER TABLE publisher_offering_relationships 
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN publisher_offering_relationships.contact_email IS 'Primary contact email for this publisher-website relationship';
COMMENT ON COLUMN publisher_offering_relationships.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN publisher_offering_relationships.contact_name IS 'Name of contact person';
COMMENT ON COLUMN publisher_offering_relationships.internal_notes IS 'Internal notes about this relationship';
COMMENT ON COLUMN publisher_offering_relationships.publisher_notes IS 'Notes from the publisher';
COMMENT ON COLUMN publisher_offering_relationships.commission_rate IS 'Commission rate for this relationship';
COMMENT ON COLUMN publisher_offering_relationships.payment_terms IS 'Payment terms agreed upon';