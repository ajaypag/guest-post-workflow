-- Rollback Script for LineItems Migration
-- USE ONLY IF CRITICAL ISSUES OCCUR

-- Step 1: Re-enable orderGroups in application
-- This requires deploying the previous version of the code
-- or setting feature flags to disable lineItems system

-- Step 2: Remove migrated lineItems (only those created by migration)
DELETE FROM order_line_items
WHERE metadata->>'migrated_from_group' IS NOT NULL;

-- Step 3: Remove migration tracking
DELETE FROM migrations 
WHERE name = '0056_production_lineitems_migration';

-- Note: Original orderGroups data remains intact
-- The application will revert to using orderGroups system