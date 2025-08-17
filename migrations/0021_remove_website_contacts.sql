-- Remove Deprecated Website Contacts System
-- This migration safely removes the old website_contacts table and related objects
-- as part of the clean slate publisher CRM implementation

-- ============================================================================
-- PRE-MIGRATION SAFETY CHECKS
-- Ensure we can safely remove the old system
-- ============================================================================

-- Verify that the new publisher CRM system is in place
DO $$
BEGIN
    -- Check that new tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'publisher_contacts') THEN
        RAISE EXCEPTION 'publisher_contacts table does not exist. Run migration 0020 first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_website_associations') THEN
        RAISE EXCEPTION 'contact_website_associations table does not exist. Run migration 0020 first.';
    END IF;
    
    -- Log the pre-migration state
    RAISE NOTICE 'Pre-migration check: New publisher CRM tables exist and are ready';
END $$;

-- ============================================================================
-- DATA BACKUP (OPTIONAL)
-- Export existing contact data for manual backup if needed
-- ============================================================================

-- Create a temporary backup table (optional - can be used for manual outreach)
CREATE TABLE IF NOT EXISTS website_contacts_backup AS
SELECT 
    wc.*,
    w.domain,
    w.guest_post_cost as website_guest_post_cost,
    CURRENT_TIMESTAMP as backup_created_at
FROM website_contacts wc
LEFT JOIN websites w ON w.id = wc.website_id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_contacts');

-- Log backup creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_contacts_backup') THEN
        RAISE NOTICE 'Backup table created: website_contacts_backup with % records', 
            (SELECT COUNT(*) FROM website_contacts_backup);
    ELSE
        RAISE NOTICE 'No website_contacts table found - no backup needed';
    END IF;
END $$;

-- ============================================================================
-- REMOVE DEPRECATED SCHEMA DEPENDENCIES
-- Clean up foreign key references and related objects
-- ============================================================================

-- Drop any views that depend on website_contacts
DROP VIEW IF EXISTS website_contacts_with_details CASCADE;

-- Drop any triggers on website_contacts
DROP TRIGGER IF EXISTS website_contacts_updated_at_trigger ON website_contacts CASCADE;

-- Drop any functions specifically for website_contacts (be careful with shared functions)
-- Note: We're not dropping update_updated_at_column as it's used by other tables

-- ============================================================================
-- REMOVE WEBSITE_CONTACTS TABLE
-- Primary table removal with cascade to handle dependencies
-- ============================================================================

-- Drop the website_contacts table and all dependent objects
DROP TABLE IF EXISTS website_contacts CASCADE;

-- ============================================================================
-- UPDATE SCHEMA RELATIONSHIPS
-- Remove website_contacts from any remaining schema definitions
-- ============================================================================

-- Note: The following would need to be done in application code:
-- 1. Remove websiteContacts from websiteSchema.ts
-- 2. Remove websiteContactsRelations from schema files
-- 3. Update any import/export statements
-- 4. Remove related service methods

-- ============================================================================
-- CLEANUP AND VALIDATION
-- Ensure clean removal and validate new system integrity
-- ============================================================================

-- Verify website_contacts table is removed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_contacts') THEN
        RAISE EXCEPTION 'website_contacts table still exists after DROP operation';
    ELSE
        RAISE NOTICE 'Successfully removed website_contacts table';
    END IF;
END $$;

-- Verify websites table integrity (should be unaffected)
DO $$
DECLARE
    website_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO website_count FROM websites;
    RAISE NOTICE 'Websites table preserved with % records', website_count;
    
    -- Check that enhanced columns were added in previous migration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'websites' AND column_name = 'primary_contact_id'
    ) THEN
        RAISE WARNING 'Enhanced website columns not found. Ensure migration 0020 was applied successfully.';
    ELSE
        RAISE NOTICE 'Enhanced website columns confirmed present';
    END IF;
END $$;

-- Verify new publisher CRM system integrity
DO $$
DECLARE
    contact_count INTEGER;
    association_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contact_count FROM publisher_contacts;
    SELECT COUNT(*) INTO association_count FROM contact_website_associations;
    
    RAISE NOTICE 'Publisher CRM system ready - Contacts: %, Associations: %', 
        contact_count, association_count;
END $$;

-- ============================================================================
-- POST-MIGRATION CLEANUP
-- Optional cleanup of backup data and logging
-- ============================================================================

-- The backup table is kept by default for manual reference
-- Uncomment the following line to remove it if you don't need the backup:
-- DROP TABLE IF EXISTS website_contacts_backup;

-- Add comment to backup table explaining its purpose
COMMENT ON TABLE website_contacts_backup IS 
    'Backup of deprecated website_contacts data created during migration to publisher CRM system. ' ||
    'Can be used for manual publisher outreach if needed. Safe to drop after successful re-onboarding.';

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '0021_remove_website_contacts', 
    NOW(), 
    'Safely removed deprecated website_contacts table as part of publisher CRM clean slate implementation. Backup table created for manual reference.'
) ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- Old contact system removed, new publisher CRM system is now the single source
-- ============================================================================

-- Final status message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION 0021 COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Old website_contacts system has been safely removed.';
    RAISE NOTICE 'New publisher CRM system is now active and ready for use.';
    RAISE NOTICE 'Backup table "website_contacts_backup" created for manual reference.';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update application code to remove websiteContacts references';
    RAISE NOTICE '2. Deploy new publisher portal and CRM interfaces';
    RAISE NOTICE '3. Begin publisher re-onboarding process';
    RAISE NOTICE '4. Monitor system performance and publisher adoption';
    RAISE NOTICE '============================================================================';
END $$;